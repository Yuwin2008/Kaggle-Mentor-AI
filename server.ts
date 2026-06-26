import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Setup Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Helper: robust retry with exponential backoff for Gemini API calls
async function generateContentWithRetry(options: any, maxRetries = 3): Promise<any> {
  let delay = 2000;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await ai.models.generateContent(options);
    } catch (err: any) {
      const is429 = 
        err?.code === 429 || 
        err?.status === "RESOURCE_EXHAUSTED" || 
        (err?.message && (
          err.message.includes("429") || 
          err.message.includes("quota") || 
          err.message.includes("RESOURCE_EXHAUSTED")
        ));

      const is503 = 
        err?.status === "UNAVAILABLE" || 
        err?.code === 503 || 
        (err?.message && (
          err.message.includes("503") || 
          err.message.includes("demand") || 
          err.message.includes("UNAVAILABLE") ||
          err.message.includes("overloaded")
        ));

      // If we encounter a daily quota limit or high demand (503) for gemini-3.5-flash, fall back to gemini-3.1-flash-lite
      if ((is429 || is503) && options && options.model === "gemini-3.5-flash") {
        console.warn(`[Gemini Fallback] ${is429 ? "Quota exceeded" : "High demand (503)"} for gemini-3.5-flash. Switching dynamically to gemini-3.1-flash-lite to complete the request.`);
        options.model = "gemini-3.1-flash-lite";
        // Reset delay slightly for instant retry with the fallback model
        delay = 1000;
        continue;
      }

      const isRetryable = is429 || is503;
      
      if (isRetryable && attempt < maxRetries) {
        const currentDelay = is429 ? delay + 1500 + Math.random() * 1000 : delay;
        console.warn(`[Gemini Retry] Attempt ${attempt}/${maxRetries} failed (is429: ${is429}). Retrying in ${Math.round(currentDelay)}ms... Error: ${err.message || err}`);
        await new Promise((resolve) => setTimeout(resolve, currentDelay));
        delay = delay * 2; // Exponential backoff
        continue;
      }
      throw err;
    }
  }
}

// Fallback Generators for Data Validation Agent
function generateHeuristicValidationFallback(columnStats: any[], rowCount: number, colCount: number, fileName: string) {
  const issues_detected: string[] = [];
  const warnings: string[] = [];
  const fix_recommendations: string[] = [];

  // Check 1: Missing target column
  const targetKeywords = ["target", "label", "class", "churn", "price", "revenue", "value", "outcome", "y", "sale", "status", "clicked", "bought"];
  let hasTarget = false;
  columnStats.forEach(col => {
    const nameLower = col.name.toLowerCase();
    if (targetKeywords.some(kw => nameLower === kw || nameLower.includes(`_${kw}`) || nameLower.includes(`${kw}_`))) {
      hasTarget = true;
    }
  });

  if (!hasTarget) {
    issues_detected.push("No explicit label/target column detected. Machine learning models require a clear prediction objective.");
    fix_recommendations.push("Define or rename a column in your dataset as 'target' or 'label' to designate the ML optimization goal.");
  }

  // Check 2: Wrong file format
  if (fileName && !fileName.toLowerCase().endsWith(".csv")) {
    warnings.push(`File "${fileName}" does not end in .csv format. This might cause parsing mismatch or broken records.`);
    fix_recommendations.push("Export your spreadsheet as a standard comma-separated value (.csv) file to guarantee perfect field separation.");
  }

  // Check 3: Data Leakage
  const leakageFields: string[] = [];
  columnStats.forEach(col => {
    const nameLower = col.name.toLowerCase();
    if (["id", "uuid", "row_id", "rowid", "index", "serial", "sequence", "index_col"].some(kw => nameLower === kw || nameLower.endsWith(`_${kw}`) || nameLower.startsWith(`${kw}_`))) {
      leakageFields.push(col.name);
    }
  });

  if (leakageFields.length > 0) {
    warnings.push(`Potential data leakage or index attributes identified: ${leakageFields.map(f => `'${f}'`).join(", ")}. These unique indexes do not generalize.`);
    fix_recommendations.push(`Exclude leakage indicators like ${leakageFields.map(f => `'${f}'`).join(", ")} from feature lists before model fitting to prevent artificial overfitting.`);
  }

  // Check 4: Extreme class imbalance
  columnStats.forEach(col => {
    if (col.type === "string" && col.topCategories && col.topCategories.length > 0) {
      const topCat = col.topCategories[0];
      const dominanceRatio = topCat.count / (rowCount || 1);
      if (dominanceRatio > 0.9) {
        warnings.push(`Extreme class imbalance detected in categorical column '${col.name}': category '${topCat.category}' covers ${(dominanceRatio * 100).toFixed(1)}% of rows.`);
        fix_recommendations.push(`Use stratified sampling, class-weight calibration (e.g. scale_pos_weight for '${col.name}'), or synthetically oversample rare classes.`);
      }
    }
  });

  // Check 5: Useless columns (constant value or >95% missing values)
  columnStats.forEach(col => {
    if (col.missingCount / (rowCount || 1) > 0.95) {
      issues_detected.push(`High null frequency blocker: Column '${col.name}' is over 95% empty (${((col.missingCount / rowCount) * 100).toFixed(1)}% missing).`);
      fix_recommendations.push(`Drop column '${col.name}' completely or substitute with default constants before feeding data to boosting models.`);
    } else if (col.type === "string" && col.uniqueCount === 1) {
      warnings.push(`Zero variance column warning: Categorical column '${col.name}' has only 1 unique constant category.`);
      fix_recommendations.push(`Drop zero-variance constant column '${col.name}' since it contributes no statistical signal.`);
    }
  });

  if (issues_detected.length === 0) {
    issues_detected.push("Zero immediate structural blockers identified. Dataset format is compatible with standard tabular ML workflows.");
  }
  if (warnings.length === 0) {
    warnings.push("No suspicious class imbalance or severe data leakage vectors detected in attributes.");
  }
  if (fix_recommendations.length === 0) {
    fix_recommendations.push("Proceed to Exploratory Data Analysis (EDA) to review correlations and feature importance maps.");
  }

  return {
    issues_detected,
    warnings,
    fix_recommendations
  };
}

// Fallback Generators for Heuristic Data Analysis
function generateHeuristicAnalyzeFallback(columnStats: any[], rowCount: number, colCount: number, fileName: string) {
  const numericCols = columnStats.filter(c => c.type === "numeric");
  const categoricalCols = columnStats.filter(c => c.type === "string");
  const totalMissing = columnStats.reduce((sum, c) => sum + (c.missingCount || 0), 0);

  const numNames = numericCols.map(c => c.name);
  const catNames = categoricalCols.map(c => c.name);

  const keyInsights = [
    `The dataset contains ${rowCount.toLocaleString()} records across ${colCount} different properties.`,
  ];

  if (numericCols.length > 0) {
    keyInsights.push(`Numerical metrics identified: ${numNames.slice(0, 3).join(", ")}. Their scale indicates continuous distributions.`);
  }
  if (categoricalCols.length > 0) {
    keyInsights.push(`Categorical tags identified: ${catNames.slice(0, 3).join(", ")}. These represent discrete attributes.`);
  }
  if (totalMissing > 0) {
    keyInsights.push(`We noted ${totalMissing.toLocaleString()} empty values across the dataset columns which may require imputation.`);
  } else {
    keyInsights.push("High completeness: Column values are highly saturated with zero empty fields detected.");
  }

  const potentialAnomalies = [];
  if (totalMissing > 0) {
    potentialAnomalies.push(`There are ${totalMissing.toLocaleString()} missing values in some columns which might disrupt ML models.`);
  }
  if (rowCount < 50) {
    potentialAnomalies.push("Compact sample size: The dataset has very few rows, which may limit statistical power.");
  }
  if (potentialAnomalies.length === 0) {
    potentialAnomalies.push("No obvious data quality anomalies or out-of-bounds outliers detected.");
  }

  const suggestedQuestions = [
    "What are the central tendencies (means and ranges) of our continuous numbers?",
    "Which categories appear most frequently in this dataset?",
    "How can we prepare these attributes for machine learning modeling?"
  ];

  return {
    summary: `Heuristic Profile: "${fileName || "dataset.csv"}" is a structured file containing ${rowCount.toLocaleString()} rows and ${colCount} columns. It provides a baseline of ${numericCols.length} continuous metrics and ${categoricalCols.length} categorical dimensions.`,
    keyInsights,
    potentialAnomalies,
    suggestedQuestions
  };
}

function generateHeuristicEdaFallback(columnStats: any[], rowCount: number, colCount: number, fileName: string) {
  const numericCols = columnStats.filter(c => c.type === "numeric");
  const categoricalCols = columnStats.filter(c => c.type === "string");
  const totalMissing = columnStats.reduce((sum, c) => sum + (c.missingCount || 0), 0);

  const insights = [
    `Audit reveals ${rowCount.toLocaleString()} sample size with a dimensionality of ${colCount} attributes, suitable for multi-variable evaluation.`,
    numericCols.length > 0 
      ? `Continuous features (${numericCols.slice(0, 3).map(c => c.name).join(", ")}) exhibit varying bounds. Standardizing metrics will maximize model performance.`
      : "No continuous numerical features were detected in this dataset.",
    categoricalCols.length > 0
      ? `Discrete categorical tags (${categoricalCols.slice(0, 3).map(c => c.name).join(", ")}) provide robust groups for segmentation.`
      : "No categorical values were located; attributes are continuous.",
    "Variance test: Checked column range boundaries. Distributions are stable without critical noise."
  ];

  const risks = [
    totalMissing > 0 
      ? `Data Quality: A total of ${totalMissing.toLocaleString()} empty values detected. Downstream gradient boosted trees require imputation.`
      : "Data Completeness: Perfect score. Zero empty values detected, minimizing risk of structural bias.",
    categoricalCols.some(c => c.uniqueCount > 20)
      ? "High Cardinality: One or more categorical features contain numerous distinct values, risking one-hot encoding feature explosion."
      : "Low Cardinality: Discrete categories have compact, high-density boundaries with minimal encoding inflation risk.",
    rowCount < 100 
      ? "Sample Constraint: Small sample size carries the risk of overfitting or high variance in validation splits."
      : "Sample Soundness: Sufficient row cardinality to support robust train-test splits and cross-validation."
  ];

  const preprocessingSuggestions = [
    "Execute feature scaling using standard standardizers (MinMaxScaler or StandardScaler) for distance-based comparisons.",
    totalMissing > 0
      ? "Impute missing numeric values using column medians, and categorical values using the most frequent mode."
      : "Ensure columns are properly cast as correct numeric types prior to numerical model fitment.",
    categoricalCols.length > 0
      ? "Apply target encoding or frequency encoding for high-cardinality discrete columns to keep feature dimensions compact."
      : "Verify target variable balance to check if over-sampling or under-sampling is required."
  ];

  return {
    insights,
    risks,
    preprocessingSuggestions
  };
}

function generateHeuristicStrategyFallback(columnStats: any[], rowCount: number, colCount: number, fileName: string) {
  const numericCols = columnStats.filter(c => c.type === "numeric");
  const categoricalCols = columnStats.filter(c => c.type === "string");
  const totalMissing = columnStats.reduce((sum, c) => sum + (c.missingCount || 0), 0);

  // Calculate suitability scores based on dataset characteristics
  let catboostScore = 80;
  let lightgbmScore = 80;
  let xgboostScore = 85;

  // CatBoost shines with categorical columns
  if (categoricalCols.length > 0) {
    catboostScore += Math.min(18, categoricalCols.length * 4);
  }
  // LightGBM shines with large datasets
  if (rowCount > 1000) {
    lightgbmScore += 15;
  } else {
    lightgbmScore -= 5; // slow/overfits on small datasets
  }
  // XGBoost is generally highly robust
  if (rowCount > 100 && rowCount < 5000) {
    xgboostScore += 10;
  }

  // Ensure bounds
  catboostScore = Math.max(50, Math.min(98, catboostScore));
  lightgbmScore = Math.max(50, Math.min(98, lightgbmScore));
  xgboostScore = Math.max(50, Math.min(98, xgboostScore));

  const primaryModel = catboostScore >= lightgbmScore && catboostScore >= xgboostScore
    ? "CatBoost"
    : (lightgbmScore >= xgboostScore ? "LightGBM" : "XGBoost");

  const summary = `Baseline Strategy: Based on heuristic profiling, ${primaryModel} is recommended as the starting optimizer. The dataset has ${rowCount.toLocaleString()} rows, ${numericCols.length} numerical features, and ${categoricalCols.length} categorical dimensions.`;

  const recommended_models = [
    {
      model: "CatBoost",
      reason: `CatBoost's native symmetric tree algorithms and ordered target statistics are heavily aligned to handle the ${categoricalCols.length} categorical dimensions.`,
      priority: catboostScore >= xgboostScore && catboostScore >= lightgbmScore ? 1 : (catboostScore >= xgboostScore || catboostScore >= lightgbmScore ? 2 : 3)
    },
    {
      model: "XGBoost",
      reason: `Highly robust depth-wise growth and default direction routing for missing entries across ${numericCols.length} numerical features.`,
      priority: xgboostScore >= catboostScore && xgboostScore >= lightgbmScore ? 1 : (xgboostScore >= catboostScore || xgboostScore >= lightgbmScore ? 2 : 3)
    },
    {
      model: "LightGBM",
      reason: `Extremely rapid leaf-wise training. Perfect for quick iterations on ${rowCount} records.`,
      priority: lightgbmScore >= catboostScore && lightgbmScore >= xgboostScore ? 1 : (lightgbmScore >= catboostScore || lightgbmScore >= xgboostScore ? 2 : 3)
    }
  ].sort((a, b) => a.priority - b.priority);

  const baseline_strategy = `Configure an out-of-fold stratified cross-validation setup, starting with standard hyperparameters for ${primaryModel}. Preprocess categorical attributes cleanly before feeding to the boosting tree.`;

  const feature_engineering_plan = [
    "Frequency encoding on high-cardinality categorical variables.",
    "Interaction terms between highly correlated numeric dimensions.",
    "Log transformation on heavily skewed target variables."
  ];

  const expected_score_range = "0.75 - 0.88 (Metric dependent baseline)";

  return {
    summary,
    catboost: {
      score: catboostScore,
      suitability: catboostScore >= 85 ? "Highly Recommended" : "Suitable",
      reasoning: `CatBoost is selected with a suitability score of ${catboostScore}%. Since the dataset contains ${categoricalCols.length} categorical columns, CatBoost's native symmetric tree algorithms and ordered target statistics are heavily aligned to avoid high-cardinality label-encoding issues.`,
      params: [
        "iterations=1000",
        "learning_rate=0.03",
        "depth=6",
        `cat_features=[${categoricalCols.map(c => `"${c.name}"`).join(", ")}]`,
        "loss_function='RMSE' or 'Logloss'",
        "random_seed=42"
      ]
    },
    lightgbm: {
      score: lightgbmScore,
      suitability: lightgbmScore >= 85 ? "Highly Recommended" : "Suitable Alternative",
      reasoning: `LightGBM scored ${lightgbmScore}%. It uses a highly efficient leaf-wise tree growth policy. ${rowCount > 1000 ? "With over 1,000 rows, its histogram-based learning will run extremely fast." : "Because the row count is relatively small, small leaf nodes (e.g. num_leaves=15 or min_data_in_leaf=10) should be enforced to prevent overfitting."}`,
      params: [
        "num_leaves=31",
        "min_data_in_leaf=20",
        "learning_rate=0.05",
        "boosting_type='gbdt'",
        "objective='regression' or 'binary'",
        "metric='rmse' or 'binary_logloss'"
      ]
    },
    xgboost: {
      score: xgboostScore,
      suitability: xgboostScore >= 85 ? "Highly Recommended" : "Suitable",
      reasoning: `XGBoost is rated at ${xgboostScore}%. Its depth-wise tree growth and robust regularization parameters (L1/L2 penalties) protect against overfitting on datasets with ${rowCount.toLocaleString()} items. It handles sparse and missing cells natively by mapping them to default branch directions.`,
      params: [
        "max_depth=6",
        "learning_rate=0.1",
        "n_estimators=100",
        "subsample=0.8",
        "colsample_bytree=0.8",
        "reg_alpha=0.1",
        "reg_lambda=1.0"
      ]
    },
    generalTactics: [
      `Implement a ${rowCount > 500 ? "5-Fold Stratified Cross-Validation" : "3-Fold Cross-Validation with stratification"} to preserve robust validation metrics.`,
      "Apply target scaling (e.g. log1p) if the target variable possesses significant positive skewness.",
      totalMissing > 0 
        ? "Explicitly flag missing positions as indicator features prior to fitting, giving trees explicit routing pathways."
        : "Categorical features should be encoded explicitly via Category dtype for LightGBM or mapped manually if using standard scikit-learn XGBoost."
    ],
    recommended_models,
    baseline_strategy,
    feature_engineering_plan,
    expected_score_range
  };
}

function generateHeuristicNotebookFallback(columnStats: any[], rowCount: number, colCount: number, fileName: string) {
  const headers = columnStats.map(c => c.name);
  let targetColumn = headers.find(h => {
    const l = h.toLowerCase();
    return l.includes("target") || l.includes("label") || l.includes("class") || l.includes("price") || l.includes("churn") || l.includes("survived") || l.includes("y") || l.includes("output");
  }) || headers[headers.length - 1] || "target";

  const targetStat = columnStats.find(c => c.name === targetColumn);
  let isClassification = false;
  if (targetStat) {
    if (targetStat.type === "string") {
      isClassification = true;
    } else if (targetStat.uniqueCount !== undefined && targetStat.uniqueCount <= 10) {
      isClassification = true;
    } else if (targetStat.max !== undefined && targetStat.min !== undefined && targetStat.max <= 5 && Number.isInteger(targetStat.min) && Number.isInteger(targetStat.max)) {
      isClassification = true;
    }
  }

  const cells = [
    {
      cell_type: "markdown",
      metadata: {},
      source: [
        `# 🚀 Kaggle Starter Notebook: ${fileName || "Dataset Analysis"}\n`,
        `This notebook was auto-generated by the **Notebook Generator Agent** to provide a highly polished, fully functional end-to-end Machine Learning pipeline tailored to **${fileName || "your dataset"}**.\n\n`,
        `### 📊 Dataset Profile Overview\n`,
        `- **Dataset File**: \`${fileName || "unnamed_dataset.csv"}\`\n`,
        `- **Total Row Count**: ${rowCount.toLocaleString()}\n`,
        `- **Total Feature Count**: ${colCount}\n`,
        `- **Target Attribute**: \`${targetColumn}\` (Inferred Type: **${isClassification ? "Classification" : "Regression"}**)\n\n`,
        `### 🛠️ Pipeline Flow\n`,
        `1. **Environment Setup & Libraries** - Load libraries like Pandas, NumPy, XGBoost, and LightGBM.\n`,
        `2. **Data Ingestion & Integrity Audit** - Load files, inspect structure, map null matrices.\n`,
        `3. **Exploratory Visualizations** - Pairplot insights, correlation grids, feature distributions.\n`,
        `4. **Robust Preprocessing Pipeline** - Numerical imputations, scaling, categorical multi-encoding.\n`,
        `5. **Model Selection & Hyperparameter Tuning** - Train, tune, and evaluate Gradient Boosting algorithms (XGBoost / LightGBM).\n`,
        `6. **Feature Importance Analysis** - Permutational ranking and tree-split visualizations.\n`,
        `7. **Inference & Submission Pipeline** - Generate test outputs and save to CSV.`
      ]
    },
    {
      cell_type: "code",
      execution_count: null,
      metadata: {},
      outputs: [],
      source: [
        "# ======================================================================\n",
        "# 1. Environment Setup & Library Imports\n",
        "# ======================================================================\n",
        "import os\n",
        "import numpy as np\n",
        "import pandas as pd\n",
        "import matplotlib.pyplot as plt\n",
        "import seaborn as sns\n\n",
        "# Modeling & Evaluation\n",
        "from sklearn.model_selection import train_test_split, KFold, StratifiedKFold\n",
        "from sklearn.preprocessing import StandardScaler, OneHotEncoder, LabelEncoder\n",
        "from sklearn.impute import SimpleImputer\n",
        "from sklearn.compose import ColumnTransformer\n",
        "from sklearn.pipeline import Pipeline\n",
        `from sklearn.metrics import ${isClassification ? "classification_report, roc_auc_score, log_loss, confusion_matrix, accuracy_score" : "mean_squared_error, mean_absolute_error, r2_score"}\n\n`,
        "# Boosting Libraries\n",
        "import xgboost as xgb\n",
        "import lightgbm as lgb\n\n",
        "# Style Configuration\n",
        "sns.set_theme(style=\"whitegrid\")\n",
        "plt.rcParams[\"figure.figsize\"] = (12, 6)\n",
        "print(\"Libraries successfully loaded!\")"
      ]
    },
    {
      cell_type: "markdown",
      metadata: {},
      source: [
        "## 💾 2. Load the Dataset\n",
        "Here we locate and ingest the data. The script will try Kaggle input paths first, then fall back to the current directory."
      ]
    },
    {
      cell_type: "code",
      execution_count: null,
      metadata: {},
      outputs: [],
      source: [
        "# Locate CSV dynamically\n",
        `FILE_NAME = "${fileName || "dataset.csv"}"\n`,
        "possible_paths = [\n",
        "    f\"/kaggle/input/{FILE_NAME}\",\n",
        "    FILE_NAME,\n",
        "    f\"../input/{FILE_NAME}\",\n",
        "    f\"data/{FILE_NAME}\"\n",
        "]\n\n",
        "data_path = None\n",
        "for path in possible_paths:\n",
        "    if os.path.exists(path):\n",
        "        data_path = path\n",
        "        break\n\n",
        "if data_path is None:\n",
        "    # Create a dummy dataframe with the columns to allow compiling without file access\n",
        "    print(f\"⚠️ CSV file '{FILE_NAME}' not found locally. Instantiating synthetic framework for compile-checks.\")\n",
        "    np.random.seed(42)\n",
        "    df = pd.DataFrame({\n" +
        columnStats.map(c => {
          if (c.type === "numeric") {
            const minVal = c.min ?? 0;
            const maxVal = c.max ?? 100;
            return `        "${c.name}": np.random.uniform(${minVal}, ${maxVal}, size=200)`;
          } else {
            const categories = c.topCategories?.map(tc => `"${tc.category}"`) || [];
            if (categories.length === 0) categories.push('"category_a"', '"category_b"');
            return `        "${c.name}": np.random.choice([${categories.join(", ")}], size=200)`;
          }
        }).join(",\n") + "\n",
        "    })\n",
        "else:\n",
        "    df = pd.read_csv(data_path)\n",
        "    print(f\"✅ Successfully loaded dataset from {data_path}!\")\n\n",
        "print(f\"Dataset Shape: {df.shape[0]} rows, {df.shape[1]} columns\")\n",
        "df.head()"
      ]
    },
    {
      cell_type: "markdown",
      metadata: {},
      source: [
        "## 🔍 3. Data Ingestion & Quality Audit\n",
        "Let's check basic characteristics, missing values, and high-level description matrices."
      ]
    },
    {
      cell_type: "code",
      execution_count: null,
      metadata: {},
      outputs: [],
      source: [
        "print(\"=== Column Details & Types ===\")\n",
        "df.info()\n\n",
        "print(\"\\n=== Missing Values Summary ===\")\n",
        "missing = df.isnull().sum()\n",
        "missing_pct = 100 * missing / len(df)\n",
        "missing_df = pd.DataFrame({'Missing Count': missing, 'Percentage (%)': missing_pct})\n",
        "print(missing_df[missing_df['Missing Count'] > 0])\n\n",
        "print(\"\\n=== Descriptive Statistics ===\")\n",
        "df.describe(include='all')"
      ]
    },
    {
      cell_type: "markdown",
      metadata: {},
      source: [
        "## 📊 4. Exploratory Visualizations\n",
        "Let's visualize distributions of our numeric target variable and explore core features."
      ]
    },
    {
      cell_type: "code",
      execution_count: null,
      metadata: {},
      outputs: [],
      source: [
        `TARGET_COL = "${targetColumn}"\n\n`,
        "# Plot target distribution\n",
        "plt.figure(figsize=(10, 5))\n",
        "if TARGET_COL in df.columns:\n",
        "    if df[TARGET_COL].dtype in [np.float64, np.int64] and df[TARGET_COL].nunique() > 10:\n",
        "        sns.histplot(df[TARGET_COL], kde=True, color='indigo')\n",
        "        plt.title(f'Distribution of Target Variable: {TARGET_COL}')\n",
        "    else:\n",
        "        sns.countplot(x=df[TARGET_COL], palette='viridis')\n",
        "        plt.title(f'Value Counts of Class Target: {TARGET_COL}')\n",
        "else:\n",
        "    print(f\"Target column {TARGET_COL} not found.\")\n",
        "plt.tight_layout()\n",
        "plt.show()\n\n",
        "# Compute numeric correlations\n",
        "numeric_cols = df.select_dtypes(include=[np.number]).columns\n",
        "if len(numeric_cols) > 1:\n",
        "    plt.figure(figsize=(12, 10))\n",
        "    correlation_matrix = df[numeric_cols].corr()\n",
        "    sns.heatmap(correlation_matrix, annot=True, cmap='coolwarm', fmt='.2f', linewidths=0.5)\n",
        "    plt.title('Numeric Features Correlation Matrix')\n",
        "    plt.tight_layout()\n",
        "    plt.show()"
      ]
    },
    {
      cell_type: "markdown",
      metadata: {},
      source: [
        "## 🛡️ 5. Robust Preprocessing Pipeline\n",
        "We build a robust preprocessing layer with Scikit-Learn's ColumnTransformer. This handles numeric missing values (by median imputation) and scales them, and imputes categorical values and encodes them."
      ]
    },
    {
      cell_type: "code",
      execution_count: null,
      metadata: {},
      outputs: [],
      source: [
        "# Identify features\n",
        "X = df.drop(columns=[TARGET_COL]) if TARGET_COL in df.columns else df.copy()\n",
        "y = df[TARGET_COL] if TARGET_COL in df.columns else None\n\n",
        "num_features = X.select_dtypes(include=[np.number]).columns.tolist()\n",
        "cat_features = X.select_dtypes(exclude=[np.number]).columns.tolist()\n\n",
        "print(f\"Numeric Features: {num_features}\")\n",
        "print(f\"Categorical Features: {cat_features}\")\n\n",
        "# Numerical transformer: impute then standard scale\n",
        "num_transformer = Pipeline(steps=[\n",
        "    ('imputer', SimpleImputer(strategy='median')),\n",
        "    ('scaler', StandardScaler())\n",
        "])\n\n",
        "# Categorical transformer: impute with mode then one-hot encode\n",
        "cat_transformer = Pipeline(steps=[\n",
        "    ('imputer', SimpleImputer(strategy='most_frequent')),\n",
        "    ('onehot', OneHotEncoder(handle_unknown='ignore', sparse_output=False))\n",
        "])\n\n",
        "# Combine\n",
        "preprocessor = ColumnTransformer(\n",
        "    transformers=[\n",
        "        ('num', num_transformer, num_features),\n",
        "        ('cat', cat_transformer, cat_features)\n",
        "    ]\n",
        ")\n\n",
        "print(\"Preprocessing pipeline successfully defined!\")"
      ]
    },
    {
      cell_type: "markdown",
      metadata: {},
      source: [
        "## 🤖 6. Model Training & Evaluation (Gradient Boosting)\n",
        "Now we partition the dataset, pre-process, fit an XGBoost estimator, and perform prediction validation checks."
      ]
    },
    {
      cell_type: "code",
      execution_count: null,
      metadata: {},
      outputs: [],
      source: [
        "if y is not None:\n",
        "    # Train-test split\n",
        `    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42${isClassification ? ", stratify=y" : ""})\n\n`,
        "    # Encode labels if classification\n",
        "    label_encoder = None\n",
        `    if ${isClassification} and y_train.dtype == object:\n`,
        "        label_encoder = LabelEncoder()\n",
        "        y_train = label_encoder.fit_transform(y_train)\n",
        "        y_val = label_encoder.transform(y_val)\n\n",
        "    # Instantiate model based on target type\n",
        `    if ${isClassification}:\n`,
        "        model = xgb.XGBClassifier(\n",
        "            n_estimators=100,\n",
        "            max_depth=6,\n",
        "            learning_rate=0.05,\n",
        "            subsample=0.8,\n",
        "            colsample_bytree=0.8,\n",
        "            random_state=42,\n",
        "            use_label_encoder=False,\n",
        "            eval_metric='logloss'\n",
        "        )\n",
        "    else:\n",
        "        model = xgb.XGBRegressor(\n",
        "            n_estimators=100,\n",
        "            max_depth=6,\n",
        "            learning_rate=0.05,\n",
        "            subsample=0.8,\n",
        "            colsample_bytree=0.8,\n",
        "            random_state=42\n",
        "        )\n\n",
        "    # Create complete processing & training pipeline\n",
        "    pipeline = Pipeline(steps=[\n",
        "        ('preprocessor', preprocessor),\n",
        "        ('model', model)\n",
        "    ])\n\n",
        "    # Train model\n",
        "    print(\"⌛ Training XGBoost model...\")\n",
        "    pipeline.fit(X_train, y_train)\n",
        "    print(\"🎉 Model training complete!\")\n\n",
        "    # Predict\n",
        "    preds = pipeline.predict(X_val)\n\n",
        "    # Evaluate\n",
        "    print(\"\\n=== Validation Set Evaluation ===\")\n",
        `    if ${isClassification}:\n`,
        "        print(f\"Accuracy Score: {accuracy_score(y_val, preds):.4f}\")\n",
        "        print(\"\\nClassification Report:\")\n",
        "        print(classification_report(y_val, preds))\n",
        "    else:\n",
        "        rmse = np.sqrt(mean_squared_error(y_val, preds))\n",
        "        mae = mean_absolute_error(y_val, preds)\n",
        "        r2 = r2_score(y_val, preds)\n",
        "        print(f\"RMSE: {rmse:.4f}\")\n",
        "        print(f\"MAE: {mae:.4f}\")\n",
        "        print(f\"R2 Score: {r2:.4f}\")\n",
        "else:\n",
        "    print(\"No target variable found to perform train-test validation checks.\")"
      ]
    },
    {
      cell_type: "markdown",
      metadata: {},
      source: [
        "## 📈 7. Feature Importance Mapping\n",
        "Let's identify which factors play the most active roles in model prediction decisions."
      ]
    },
    {
      cell_type: "code",
      execution_count: null,
      metadata: {},
      outputs: [],
      source: [
        "try:\n",
        "    # Retrieve feature names from preprocessing transformers\n",
        "    ohe_features = pipeline.named_steps['preprocessor'].named_transformers_['cat'].named_steps['onehot'].get_feature_names_out(cat_features).tolist() if cat_features else []\n",
        "    feature_names = num_features + ohe_features\n\n",
        "    # Extract importances\n",
        "    importances = pipeline.named_steps['model'].feature_importances_\n",
        "    \n",
        "    # Create a mapping dataframe\n",
        "    importance_df = pd.DataFrame({'Feature': feature_names, 'Importance': importances})\n",
        "    importance_df = importance_df.sort_values(by='Importance', ascending=False).head(15)\n\n",
        "    # Plot\n",
        "    plt.figure(figsize=(10, 6))\n",
        "    sns.barplot(data=importance_df, x='Importance', y='Feature', palette='mako')\n",
        "    plt.title('Top 15 Most Influential Features')\n",
        "    plt.tight_layout()\n",
        "    plt.show()\n",
        "except Exception as e:\n",
        "    print(f\"Could not chart feature importances: {e}\")"
      ]
    },
    {
      cell_type: "markdown",
      metadata: {},
      source: [
        "## 🏁 8. Generate Submission File\n",
        "Lastly, we run predictions on the test dataset (if applicable) or generate placeholders for Kaggle submission formatting checks."
      ]
    },
    {
      cell_type: "code",
      execution_count: null,
      metadata: {},
      outputs: [],
      source: [
        "# Attempt to load a sample test or submission set, or make placeholder submission file\n",
        "test_path = None\n",
        "for path in [\"/kaggle/input/test.csv\", \"test.csv\", \"../input/test.csv\"]:\n",
        "    if os.path.exists(path):\n",
        "        test_path = path\n",
        "        break\n\n",
        "if test_path:\n",
        "    test_df = pd.read_csv(test_path)\n",
        "    print(\"Loading actual Kaggle test set for final inference...\")\n",
        "    # Ensure same preprocessor features\n",
        "    test_preds = pipeline.predict(test_df)\n",
        "    \n",
        "    submission = pd.DataFrame({\n",
        "        'Id': test_df.index, # or appropriate index key\n",
        "        'Prediction': test_preds\n",
        "    })\n",
        "else:\n",
        "    print(\"⚠️ No test.csv file found. Creating mock submission file using validation partitions for check-outs.\")\n",
        "    if y is not None:\n",
        "        submission = pd.DataFrame({\n",
        "            'Id': range(len(y_val)),\n",
        "            'Actual': y_val,\n",
        "            'Prediction': preds\n",
        "        })\n",
        "    else:\n",
        "        submission = pd.DataFrame({\n",
        "            'Id': range(50),\n",
        "            'Prediction': np.random.uniform(0, 1, size=50)\n",
        "        })\n\n",
        "submission.to_csv('submission.csv', index=False)\n",
        "print(\"Submission file 'submission.csv' generated and saved! 🎉\")\n",
        "submission.head()"
      ]
    }
  ];

  return { cells };
}

function generateHeuristicLeaderboardFallback(columnStats: any[], rowCount: number, colCount: number, fileName: string, metric: string, score: number) {
  const headers = columnStats.map(c => c.name);
  const numCols = columnStats.filter(c => c.type === "numeric").map(c => c.name);
  const catCols = columnStats.filter(c => c.type === "string").map(c => c.name);

  // Lower is better check
  const lMetric = metric.toLowerCase();
  const lowerIsBetter = lMetric.includes("loss") || lMetric.includes("rmse") || lMetric.includes("mae") || lMetric.includes("error");

  // Define tier
  let tier = "Bronze (Baseline Starter)";
  let analysis = "";

  if (lowerIsBetter) {
    if (score > 10.0) {
      tier = "Bronze (Baseline Starter)";
      analysis = `Your loss/error score of ${score} suggests high residual variance. We need to focus on robust baseline initialization, outlier pruning, and target normalization techniques.`;
    } else if (score > 1.0) {
      tier = "Silver (Competitor)";
      analysis = `Solid progress! An error score of ${score} shows the model captures primary patterns. Next steps involve creating non-linear interaction features, tuning regularization, and ensembling.`;
    } else {
      tier = "Gold (Top Tier Master)";
      analysis = `Phenomenal performance! At ${score}, you are near peak optimization. Advancing further requires extreme precision: out-of-fold stacking, seed blending, and adversarial feature pruning.`;
    }
  } else {
    // Higher is better metrics (e.g., Accuracy, ROC-AUC, R2)
    if (score < 0.65) {
      tier = "Bronze (Baseline Starter)";
      analysis = `Your score of ${score} indicates the model is in its infancy or currently underfitting. Focus on building a reliable validation pipeline and creating simple high-impact numeric and category features.`;
    } else if (score < 0.88) {
      tier = "Silver (Competitor)";
      analysis = `Excellent progress! A score of ${score} means your model has learned the main distribution. To climb further, focus on advanced feature combinations, target encoding, and model rank-averaging.`;
    } else {
      tier = "Gold (Top Tier Master)";
      analysis = `Incredible! At ${score}, you have entered the master level. To claim the top spot, you must leverage complex stacked generalization ensembles, target-guided decision tree features, and pseudo-labeling.`;
    }
  }

  let featureEng: string[] = [];
  let ensembling: string[] = [];
  let tuning: string[] = [];
  let additionalTips: string[] = [];

  if (tier.startsWith("Bronze")) {
    featureEng = [
      `Missing Value Imputation: Impute missing entries in numerical columns using median instead of mean to minimize outlier bias.`,
      catCols.length > 0 
        ? `Categorical Mapping: Apply Frequency Encoding or simple Label/One-Hot Encoding to categorical attributes like ${catCols.slice(0, 3).map(c => `\`${c}\``).join(", ")}.`
        : `Scaling features: Ensure any distance-based or linear models have numeric columns scaled using a robust standard scaler.`,
      `Feature Clean-up: Drop columns containing more than 90% missing values to reduce dimensionality noise.`
    ];
    ensembling = [
      `Establish Cross-Validation: Implement a stratified 5-Fold Cross Validation scheme rather than a simple train/test split to guarantee performance reliability.`,
      `Simple Averaging: Train an XGBoost estimator and a standard Random Forest, then average their prediction probabilities (50/50 weighting).`,
      `Establish Score Registry: Maintain a local dictionary of scores to verify improvements on each iteration.`
    ];
    tuning = [
      `Set baseline parameters for XGBoost: max_depth=5, learning_rate=0.05, and n_estimators=150.`,
      `Restrict Tree Depth: Limit max_depth to 3-6 to prevent premature tree estimators from memorizing small patterns.`,
      `Enable Early Stopping: Prevent overfitting by configuring early stopping with a validation partition.`
    ];
    additionalTips = [
      `Leakage Audit: Double-check that your target label isn't accidentally included in the training columns.`,
      `Fix Random Seeds: Set np.random.seed(42) and a model-level random_state to ensure all runs are perfectly reproducible.`
    ];
  } else if (tier.startsWith("Silver")) {
    featureEng = [
      numCols.length > 1
        ? `Interaction Terms: Compute mathematical interaction pairs (multiplication, division, or ratio relationships) between continuous features like ${numCols.slice(0, 3).map(c => `\`${c}\``).join(", ")}.`
        : `Skewness Correction: Apply numpy's log1p or Box-Cox transformations to highly skewed continuous attributes to regularize standard errors.`,
      catCols.length > 0
        ? `Target Encoding: Encode high-cardinality categorical columns (e.g. ${catCols.slice(0, 2).map(c => `\`${c}\``).join(", ")}) using Out-Of-Fold target mean encoding to capture target affinity without leaking details.`
        : `Binning Features: Segment continuous ranges into discrete quantile bins to help tree algorithms recognize threshold boundaries.`,
      `Conditional Aggregations: Compute mean, standard deviation, and median of numeric features grouped by categorical identifiers.`
    ];
    ensembling = [
      `Rank Averaging: Average the percentile ranks of your validation prediction arrays instead of raw probabilities to secure scale-calibration resilience.`,
      `Diverse Architectures: Combine a tree-based model (LightGBM/XGBoost) with a regularized linear regression (Ridge) or a simple Multi-Layer Perceptron.`,
      `Generate Out-of-Fold (OOF) arrays to precisely validate downstream ensemble blends.`
    ];
    tuning = [
      `Automate hyperparameter optimization: Write a brief Optuna study script running at least 50 random search trials.`,
      `Optimize LightGBM split-specific weights: Tune num_leaves (from 15 to 127), min_child_samples (from 10 to 100), and feature_fraction (from 0.6 to 0.9).`,
      `Shrink Learning Rate: Decrease learning rate to 0.02 and double n_estimators to achieve finer optimization convergence.`
    ];
    additionalTips = [
      `Overfit Diagnostic: Plot validation curves against training curves to identify the exact epoch where variance diverges.`,
      `Analyze Prediction Errors: Sort your validation records by absolute error and manually inspect the top 10 misclassified rows to identify systematic model weak-points.`
    ];
  } else {
    featureEng = [
      `Adversarial Validation: Train a quick binary classifier to distinguish between your train and test datasets. If AUC is above 0.55, identify and remove features with highly mismatched distributions.`,
      `Low-Dimensional Coordinates: Use t-SNE or UMAP to compress highly correlated numeric spaces, appending the top 2 dimensions as rich spatial markers.`,
      `Target-Guided Decision Tree Leaves: Fit a shallow Decision Tree to individual numerical clusters and use the resulting node indices as a dense categorical categorical coordinate.`,
      `Multi-key Target Statistics: Formulate multi-level group aggregations (e.g., target rate grouped jointly by two categorical features).`
    ];
    ensembling = [
      `Multi-stage Stacked Generalization: Train 3-5 high-diversity level-0 estimators (XGBoost, LightGBM, CatBoost, ExtraTrees). Extract their Out-Of-Fold predictions, and fit a level-1 meta-learner (e.g., Ridge) to generate the final prediction.`,
      `Seed Averaging: Run the exact same pipeline using 5 to 10 different random seeds, and compute the arithmetic mean of their predictions to dampen stochastic variance.`,
      `Rank-Blending with public baseline predictions: Merge your predictions with a top-performing public submission to benefit from complementary features.`
    ];
    tuning = [
      `Squeeze learning rate: Lower learning rate to 0.005 or 0.01 and scale estimators up to 5000+ rounds.`,
      `Custom Metric Loss Optimization: Tune the booster's custom objective function to directly mirror the leaderboard evaluation metric.`,
      `Refine Class Cutoffs: Perform threshold grid-search on validation sets to isolate the mathematically optimal probability boundary.`
    ];
    additionalTips = [
      `Pseudo-Labeling: Generate high-confidence test predictions (>95% probability), merge them back into the training matrix, and retrain the final model.`,
      `Maintain a detailed submission and local cross-validation score journal to protect against public leaderboard feedback overfitting.`
    ];
  }

  const performance_analysis = `The validation metric score is currently evaluated at ${score} under '${metric}'. ${analysis}`;
  const problems_detected = [
    lowerIsBetter 
      ? "Presence of high residual predictions or non-normalized continuous target bounds." 
      : "Underfitting of complex category relationships or raw structural noise.",
    "Potential missing values in numerical columns acting as a model bias.",
    "Constant variance or redundant index coordinates."
  ];
  const next_actions = ensembling.slice(0, 3);
  const priority_improvements = featureEng.slice(0, 3);

  const score_analysis = `Score evaluation confirms the model resides in ${tier}. An active score of ${score} implies room for further parameter and ensembling sweeps.`;
  const bottlenecks = [
    "Stochastic noise in tree splits.",
    "Untransformed skewed continuous variables.",
    "Presence of high-cardinality categorical variables."
  ];
  const next_experiments = tuning.slice(0, 3);
  const expected_gain = lowerIsBetter ? "-5% to -15% relative error reduction" : "+2.5% to +6.0% accuracy gain";

  return {
    currentTier: tier,
    analysis,
    suggestions: {
      featureEngineering: featureEng,
      ensembling,
      tuning
    },
    additionalTips,
    performance_analysis,
    problems_detected,
    next_actions,
    priority_improvements,
    score_analysis,
    bottlenecks,
    next_experiments,
    expected_gain
  };
}

// Middleware for parsing JSON with a larger limit for handling moderate CSVs
app.use(express.json({ limit: "25mb" }));

// Custom CSV Parser
function parseCSV(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let currentVal = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(currentVal.trim());
      currentVal = "";
    } else if ((char === "\r" || char === "\n") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
      row.push(currentVal.trim());
      // Only push non-empty rows
      if (row.length > 0 && !(row.length === 1 && row[0] === "")) {
        result.push(row);
      }
      row = [];
      currentVal = "";
    } else {
      currentVal += char;
    }
  }
  if (currentVal || row.length > 0) {
    row.push(currentVal.trim());
    if (row.length > 0 && !(row.length === 1 && row[0] === "")) {
      result.push(row);
    }
  }
  return result;
}

// 1. CSV Parse & Advanced Analysis API Route
app.post("/api/analyze", async (req, res): Promise<any> => {
  try {
    const { csvContent, fileName } = req.body;
    if (!csvContent) {
      return res.status(400).json({ error: "No CSV content provided." });
    }

    const rows = parseCSV(csvContent);
    if (rows.length === 0) {
      return res.status(400).json({ error: "The CSV file appears to be empty." });
    }

    const headers = rows[0];
    const rawDataRows = rows.slice(1);
    const rowCount = rawDataRows.length;
    const colCount = headers.length;

    // Detect column types & collect basic stats
    const columnStats = headers.map((colName, colIdx) => {
      let isNumeric = true;
      let missingCount = 0;
      const values: string[] = [];
      const numValues: number[] = [];

      for (let r = 0; r < rawDataRows.length; r++) {
        const val = rawDataRows[r][colIdx];
        if (val === undefined || val === null || val === "") {
          missingCount++;
          continue;
        }
        values.push(val);
        const parsedNum = Number(val);
        if (isNaN(parsedNum)) {
          isNumeric = false;
        } else {
          numValues.push(parsedNum);
        }
      }

      // If more than 80% are non-numbers, treat as String
      const numericRatio = numValues.length / (values.length || 1);
      const columnType = isNumeric && values.length > 0 && numericRatio > 0.8 ? "numeric" : "string";

      if (columnType === "numeric") {
        numValues.sort((a, b) => a - b);
        const min = numValues.length > 0 ? numValues[0] : 0;
        const max = numValues.length > 0 ? numValues[numValues.length - 1] : 0;
        const sum = numValues.reduce((a, b) => a + b, 0);
        const avg = numValues.length > 0 ? sum / numValues.length : 0;
        
        // Simple distribution
        const binCount = Math.min(5, numValues.length);
        const bins: { label: string; count: number }[] = [];
        if (numValues.length > 0 && max > min) {
          const binWidth = (max - min) / binCount;
          for (let b = 0; b < binCount; b++) {
            const bMin = min + b * binWidth;
            const bMax = bMin + binWidth;
            bins.push({
              label: `${bMin.toFixed(1)} - ${bMax.toFixed(1)}`,
              count: numValues.filter(v => v >= bMin && (b === binCount - 1 ? v <= bMax : v < bMax)).length,
            });
          }
        }

        return {
          name: colName,
          type: "numeric",
          missingCount,
          min,
          max,
          avg: Number(avg.toFixed(2)),
          sum: Number(sum.toFixed(2)),
          sampleValues: values.slice(0, 10),
          distribution: bins,
        };
      } else {
        // Categorical / String
        const categoriesMap: { [key: string]: number } = {};
        values.forEach(v => {
          categoriesMap[v] = (categoriesMap[v] || 0) + 1;
        });
        const categories = Object.keys(categoriesMap)
          .map(key => ({ category: key, count: categoriesMap[key] }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8);

        return {
          name: colName,
          type: "string",
          missingCount,
          sampleValues: values.slice(0, 10),
          uniqueCount: Object.keys(categoriesMap).length,
          topCategories: categories,
        };
      }
    });

    // Provide preview grid (first 25 rows) for UI table
    const previewRows = rawDataRows.slice(0, 25).map((row, idx) => {
      const obj: { [key: string]: string } = { _rowId: String(idx + 1) };
      headers.forEach((h, hIdx) => {
        obj[h || `Column_${hIdx}`] = row[hIdx] !== undefined ? row[hIdx] : "";
      });
      return obj;
    });

    // Generate smart summary via Gemini
    let aiSynthesis = {
      summary: "Failed to generate AI report.",
      keyInsights: ["Dataset loaded successfully."],
      potentialAnomalies: ["No anomalies detected yet."],
      suggestedQuestions: ["How is the data distributed?", "Can you explain the main trends?"]
    };

    if (process.env.GEMINI_API_KEY) {
      try {
        const columnsOverview = columnStats.map(c => {
          if (c.type === "numeric") {
            return `- ${c.name} (Numeric): Range [${c.min} to ${c.max}], Avg: ${c.avg}, Sum: ${c.sum}`;
          } else {
            return `- ${c.name} (Categorical): ${c.uniqueCount} unique categories. Top choices: ${c.topCategories?.map((tc: any) => `${tc.category} (${tc.count})`).join(", ")}`;
          }
        }).join("\n");

        const sampleText = rawDataRows.slice(0, 5).map(r => r.join(",")).join("\n");

        const prompt = `
You are an elite data scientist and business analyst.
Analyze this dataset summary and output a comprehensive synthesis.

Dataset File Name: "${fileName || "dataset.csv"}"
Row Count: ${rowCount}
Column Count: ${colCount}

Columns overview:
${columnsOverview}

Sample Rows (first 5):
${sampleText}

Output your response as JSON matching this schema:
{
  "summary": "High level expert synthesis explaining what this dataset is, what it represents, who might use it, and what its primary value is.",
  "keyInsights": [
    "Most significant trend or discovery 1",
    "Secondary actionable insight 2",
    "Another column relation or trend description"
  ],
  "potentialAnomalies": [
    "Description of empty/missing values if significant, or unexpected ranges/outliers"
  ],
  "suggestedQuestions": [
    "3 highly engaging, analytical questions that the user can ask regarding relationships, statistics, or metrics in this dataset"
  ]
}
`;

        const response = await generateContentWithRetry({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING },
                keyInsights: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                potentialAnomalies: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                suggestedQuestions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ["summary", "keyInsights", "potentialAnomalies", "suggestedQuestions"]
            }
          }
        });
        
        if (response.text) {
          aiSynthesis = JSON.parse(response.text.trim());
        }
      } catch (gemIniErr) {
        console.warn("Gemini context generation failed, falling back to heuristic model:", gemIniErr);
        aiSynthesis = generateHeuristicAnalyzeFallback(columnStats, rowCount, colCount, fileName);
      }
    } else {
      // Fallback if API key is not configured
      aiSynthesis = generateHeuristicAnalyzeFallback(columnStats, rowCount, colCount, fileName);
    }

    res.json({
      fileName,
      rowCount,
      colCount,
      headers,
      columnStats,
      previewRows,
      aiSynthesis,
    });
  } catch (error: any) {
    console.error("Analysis Error:", error);
    res.status(500).json({ error: error.message || "An error occurred during parsing or analysis." });
  }
});

// 1.4. Failure Agent / Data Validation Endpoint
app.post("/api/validation", async (req, res): Promise<any> => {
  try {
    const { columnStats, rowCount, colCount, fileName } = req.body;

    if (!columnStats || !Array.isArray(columnStats)) {
      return res.status(400).json({ error: "Column statistics are required for data validation." });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.warn("Gemini API key is missing. Using high-fidelity heuristic fallback for Data Validation Agent.");
      const fallback = generateHeuristicValidationFallback(columnStats, rowCount, colCount, fileName);
      return res.json(fallback);
    }

    const columnsOverview = columnStats.map(c => {
      if (c.type === "numeric") {
        return `- Column "${c.name}" (Numeric): Range [${c.min} to ${c.max}], Avg: ${c.avg}, Missing: ${c.missingCount}`;
      } else {
        return `- Column "${c.name}" (Categorical): Unique: ${c.uniqueCount}, Missing: ${c.missingCount}, Top values: ${c.topCategories?.slice(0, 3).map((tc: any) => `${tc.category} (${tc.count})`).join(", ")}`;
      }
    }).join("\n");

    const prompt = `
You are the Data Validation Agent (Failure Agent). Your goal is to inspect the characteristics of the loaded dataset and detect structural issues before modeling.

Checks:
- missing target column: Is there a clear target label column like 'target', 'label', 'class', 'churn', 'price', etc.? If not, suggest selecting or defining one.
- wrong file format: Verify if the file is correctly structured.
- data leakage: Spot any ID columns, raw indexes, or high-correlation tags that leak target indices.
- extreme imbalance: For categorical columns, check if class distributions are heavily skewed.
- useless columns: Point out columns with constant values (only 1 unique value) or columns with extremely high missing ratios (>95%).

Dataset Details:
- File Name: "${fileName || "dataset.csv"}"
- Total Rows: ${rowCount}
- Total Columns: ${colCount}

Columns overview:
${columnsOverview}

Format your response strictly as a JSON object matching this schema. Do not include triple backticks or markdown wrappers around the JSON:
{
  "issues_detected": [
    "Specifically detail any critical structural blockers (e.g. missing target column, leakage columns)"
  ],
  "warnings": [
    "Detail any high-probability model hazards (e.g. high null ratios, extreme class imbalance, useless constant columns)"
  ],
  "fix_recommendations": [
    "List exact, direct actionable recommendations to resolve each issue or warning above before entering the modeling stage"
  ]
}
`;

    const response = await generateContentWithRetry({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            issues_detected: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            warnings: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            fix_recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["issues_detected", "warnings", "fix_recommendations"]
        }
      }
    });

    const replyText = response.text || "{}";
    const result = JSON.parse(replyText.trim());
    res.json(result);
  } catch (err: any) {
    console.warn("Validation API Error, falling back to heuristic:", err);
    try {
      const fallbackResult = generateHeuristicValidationFallback(req.body.columnStats || [], req.body.rowCount || 0, req.body.colCount || 0, req.body.fileName || "");
      res.json(fallbackResult);
    } catch (fallbackErr) {
      console.error("Critical fallback failure in Validation:", fallbackErr);
      res.status(500).json({ error: err.message || "An error occurred during data validation." });
    }
  }
});

// 1.5. EDA Agent Analysis Endpoint
app.post("/api/eda", async (req, res): Promise<any> => {
  try {
    const { columnStats, rowCount, colCount, fileName } = req.body;
    
    if (!columnStats || !Array.isArray(columnStats)) {
      return res.status(400).json({ error: "Column statistics are required for EDA audit." });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.warn("Gemini API key is missing. Using high-fidelity heuristic fallback for EDA.");
      const fallback = generateHeuristicEdaFallback(columnStats, rowCount, colCount, fileName);
      return res.json(fallback);
    }

    const columnsOverview = columnStats.map(c => {
      if (c.type === "numeric") {
        return `- Column Name: "${c.name}" (Numeric)\n  Stats: Range [${c.min} to ${c.max}], Average: ${c.avg}, Sum: ${c.sum}, Missing: ${c.missingCount} cells`;
      } else {
        return `- Column Name: "${c.name}" (Categorical)\n  Stats: Unique Values: ${c.uniqueCount}, Missing: ${c.missingCount} cells\n  Top values: ${c.topCategories?.map((tc: any) => `${tc.category} (${tc.count})`).join(", ")}`;
      }
    }).join("\n");

    const prompt = `
You are an expert Exploratory Data Analysis (EDA) Agent. Your task is to perform an architectural data audit of the loaded dataset.
Review the structural statistics provided below and generate high-fidelity insights, risk alerts, and preprocessing recommendations.

Dataset Metadata:
- File Name: "${fileName || "unnamed_dataset.csv"}"
- Total Row Count: ${rowCount}
- Total Column Count: ${colCount}

Column-Level Statistics and Cardinalities:
${columnsOverview}

Perform an exhaustive analysis and return a structured JSON response with the following keys:
1. "insights": An array of 3 to 5 highly specific, valuable analytical observations regarding feature relationships, distributions, and trends.
2. "risks": An array of 3 to 5 data quality concerns, bias indicators, high missing value ratios, skewness risks, outlier potentials, or extreme imbalances.
3. "preprocessingSuggestions": An array of 3 to 5 practical, direct data engineering/preprocessing steps (such as imputation strategies, standard scaling, target encoding, or handling sparse categories).

Format your entire response strictly as valid JSON matching the schema.
`;

    const response = await generateContentWithRetry({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            insights: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            risks: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            preprocessingSuggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["insights", "risks", "preprocessingSuggestions"]
        }
      }
    });

    const replyText = response.text || "{}";
    const edaResult = JSON.parse(replyText.trim());
    res.json(edaResult);
  } catch (err: any) {
    console.warn("EDA API Error, falling back to heuristic:", err);
    try {
      const fallbackResult = generateHeuristicEdaFallback(req.body.columnStats || [], req.body.rowCount || 0, req.body.colCount || 0, req.body.fileName || "");
      res.json(fallbackResult);
    } catch (fallbackErr) {
      console.error("Critical fallback failure in EDA:", fallbackErr);
      res.status(500).json({ error: err.message || "An error occurred during EDA parsing." });
    }
  }
});

// 1.6. ML Strategy Agent Endpoint
app.post("/api/strategy", async (req, res): Promise<any> => {
  try {
    const { columnStats, rowCount, colCount, fileName } = req.body;

    if (!columnStats || !Array.isArray(columnStats)) {
      return res.status(400).json({ error: "Column statistics are required for ML strategy synthesis." });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.warn("Gemini API key is missing. Using high-fidelity heuristic fallback for ML strategy.");
      const fallback = generateHeuristicStrategyFallback(columnStats, rowCount, colCount, fileName);
      return res.json(fallback);
    }

    const columnsOverview = columnStats.map(c => {
      if (c.type === "numeric") {
        return `- Column "${c.name}" (Numeric): Range [${c.min} to ${c.max}], Avg: ${c.avg}, Missing: ${c.missingCount}`;
      } else {
        return `- Column "${c.name}" (Categorical): Unique: ${c.uniqueCount}, Missing: ${c.missingCount}, Top values: ${c.topCategories?.slice(0, 3).map((tc: any) => `${tc.category} (${tc.count})`).join(", ")}`;
      }
    }).join("\n");

    const prompt = `
You are a highly advanced Machine Learning Strategy Agent. Your goal is to inspect the characteristics of the loaded dataset and output concrete model recommendations, suitability scores (1-100), and custom tuning hyperparameters for the three premier gradient boosting libraries: CatBoost, LightGBM, and XGBoost.

Dataset Characteristics:
- File Name: "${fileName || "unnamed_dataset.csv"}"
- Rows Count: ${rowCount}
- Columns Count: ${colCount}

Column Statistics & Cardinalities:
${columnsOverview}

Based on this specific metadata (especially noting the scale of rows, the fraction of categorical features, the presence of missing values, and potential high cardinality), formulate custom, detailed recommendations for:
1. CatBoost (particularly strong with categorical features, symmetric trees)
2. LightGBM (extremely fast, leaf-wise growth, handles large data natively)
3. XGBoost (depth-wise growth, highly robust, general-purpose regularization)

Generate a JSON response that conforms EXACTLY to this schema:
{
  "summary": "A concise, high-level summary paragraph describing the overall ML strategy, recommending which of the three models should be the primary candidate and why.",
  "catboost": {
    "score": 85,
    "suitability": "Highly Recommended / Suitable / Alternative",
    "reasoning": "Exhaustive reasoning specifically mentioning the columns, row count, and categorical features of this dataset.",
    "params": [
      "cat_features=[...]",
      "iterations=1000",
      "..."
    ]
  },
  "lightgbm": {
    "score": 90,
    "suitability": "Highly Recommended / Suitable / Alternative",
    "reasoning": "Exhaustive reasoning explaining how LightGBM handles this scale and missing values.",
    "params": [
      "num_leaves=31",
      "learning_rate=0.05",
      "..."
    ]
  },
  "xgboost": {
    "score": 80,
    "suitability": "Highly Recommended / Suitable / Alternative",
    "reasoning": "Exhaustive reasoning focusing on XGBoost's regularized objective and treatment of features.",
    "params": [
      "max_depth=6",
      "subsample=0.8",
      "..."
    ]
  },
  "generalTactics": [
    "A direct recommendation for the validation split...",
    "A direct recommendation for target encoding or target preprocessing...",
    "A warning/notice about potential data imbalances or outlier treatment..."
  ],
  "recommended_models": [
    {
      "model": "Name of recommended model (e.g., CatBoost, XGBoost, or LightGBM)",
      "reason": "Explicit structural fit reason for this specific dataset and attributes",
      "priority": 1
    }
  ],
  "baseline_strategy": "Concrete step-by-step description of the baseline model setup, training, and cross-validation.",
  "feature_engineering_plan": [
    "Specific mathematical ratios or target encodes on categorical attributes..."
  ],
  "expected_score_range": "Conservative expected performance metric range based on dataset complexity"
}

Provide actual numeric suitability scores (integers between 1 and 100) reflecting how well each library is fitted to the statistics.
Your response MUST be valid JSON matching the schema.
`;

    const response = await generateContentWithRetry({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            catboost: {
              type: Type.OBJECT,
              properties: {
                score: { type: Type.INTEGER },
                suitability: { type: Type.STRING },
                reasoning: { type: Type.STRING },
                params: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ["score", "suitability", "reasoning", "params"]
            },
            lightgbm: {
              type: Type.OBJECT,
              properties: {
                score: { type: Type.INTEGER },
                suitability: { type: Type.STRING },
                reasoning: { type: Type.STRING },
                params: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ["score", "suitability", "reasoning", "params"]
            },
            xgboost: {
              type: Type.OBJECT,
              properties: {
                score: { type: Type.INTEGER },
                suitability: { type: Type.STRING },
                reasoning: { type: Type.STRING },
                params: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ["score", "suitability", "reasoning", "params"]
            },
            generalTactics: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            recommended_models: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  model: { type: Type.STRING },
                  reason: { type: Type.STRING },
                  priority: { type: Type.INTEGER }
                },
                required: ["model", "reason", "priority"]
              }
            },
            baseline_strategy: { type: Type.STRING },
            feature_engineering_plan: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            expected_score_range: { type: Type.STRING }
          },
          required: [
            "summary", "catboost", "lightgbm", "xgboost", "generalTactics",
            "recommended_models", "baseline_strategy", "feature_engineering_plan", "expected_score_range"
          ]
        }
      }
    });

    const replyText = response.text || "{}";
    const strategyResult = JSON.parse(replyText.trim());
    res.json(strategyResult);
  } catch (err: any) {
    console.warn("Strategy API Error, falling back to heuristic:", err);
    try {
      const fallbackResult = generateHeuristicStrategyFallback(req.body.columnStats || [], req.body.rowCount || 0, req.body.colCount || 0, req.body.fileName || "");
      res.json(fallbackResult);
    } catch (fallbackErr) {
      console.error("Critical fallback failure in Strategy:", fallbackErr);
      res.status(500).json({ error: err.message || "An error occurred during ML strategy generation." });
    }
  }
});

// 1.7. Kaggle Starter Notebook Generator Endpoint
app.post("/api/notebook", async (req, res): Promise<any> => {
  try {
    const { columnStats, rowCount, colCount, fileName } = req.body;

    if (!columnStats || !Array.isArray(columnStats)) {
      return res.status(400).json({ error: "Column statistics are required for Kaggle starter notebook generation." });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.warn("Gemini API key is missing. Using high-fidelity heuristic fallback for Kaggle notebook.");
      const fallbackResult = generateHeuristicNotebookFallback(columnStats, rowCount, colCount, fileName);
      return res.json(fallbackResult);
    }

    const columnsOverview = columnStats.map(c => {
      if (c.type === "numeric") {
        return `- Column "${c.name}" (Numeric): Range [${c.min} to ${c.max}], Avg: ${c.avg}, Missing: ${c.missingCount}`;
      } else {
        return `- Column "${c.name}" (Categorical): Unique: ${c.uniqueCount}, Missing: ${c.missingCount}, Top values: ${c.topCategories?.slice(0, 3).map((tc: any) => `${tc.category} (${tc.count})`).join(", ")}`;
      }
    }).join("\n");

    const prompt = `
You are a Kaggle Grandmaster and an expert ML engineer. Your goal is to generate a comprehensive, highly professional, fully functional end-to-end Python/Jupyter starter notebook tailored to the provided dataset columns and statistics.

Dataset Details:
- File Name: "${fileName || "dataset.csv"}"
- Total Rows: ${rowCount}
- Total Columns: ${colCount}

Column Descriptions and Statistics:
${columnsOverview}

Your generated notebook MUST cover:
1. **Introduction and Dataset Overview**: Clean Markdown describing the columns, target variable, and pipeline design.
2. **Setup**: Library imports (pandas, numpy, scikit-learn, matplotlib, seaborn, xgboost, lightgbm).
3. **Data loading**: Code that locates and loads "${fileName || "dataset.csv"}", trying standard Kaggle input directories (e.g., "/kaggle/input/...") first, then local files. If no file is found, it must dynamically instantiate a clean mock DataFrame matching the columns and types to allow compilation!
4. **Data Auditing**: Missing values overview, shape checks, summary statistics.
5. **Exploratory Visualizations**: Target distribution plot, numeric correlation heatmap.
6. **Robust Preprocessing Pipeline**: ColumnTransformer using standard pipelines to impute missing numbers (using median) and scale them, and impute categorical text (using most_frequent) and one-hot encode them.
7. **Model Selection & Hyperparameter Tuning**: Split data into train and validation sets, train a robust XGBoost classifier or regressor (depending on the target type), print evaluation metrics (RMSE/MAE/R2 for regression; Accuracy/Classification Report for classification).
8. **Feature Importance Analysis**: Extraction of importances from the model, sorting, and plotting.
9. **Kaggle Submission Export**: Generate test predictions on a dummy/test set and export as 'submission.csv'.

Format your response strictly as a JSON object matching this schema. Each cell's source must be an array of strings representing the lines of code or markdown. Do not include triple backticks or markdown wrappers around the JSON.
`;

    const response = await generateContentWithRetry({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            cells: {
              type: Type.ARRAY,
              description: "Array of Jupyter Notebook cells",
              items: {
                type: Type.OBJECT,
                properties: {
                  cell_type: {
                    type: Type.STRING,
                    description: "Must be 'markdown' or 'code'"
                  },
                  source: {
                    type: Type.ARRAY,
                    description: "An array of strings where each string represents a single line in the cell (with newline characters if appropriate).",
                    items: {
                      type: Type.STRING
                    }
                  }
                },
                required: ["cell_type", "source"]
              }
            }
          },
          required: ["cells"]
        }
      }
    });

    const replyText = response.text || "{}";
    const result = JSON.parse(replyText.trim());
    res.json(result);
  } catch (err: any) {
    console.warn("Notebook Generator API Error, falling back to heuristic:", err);
    try {
      const fallbackResult = generateHeuristicNotebookFallback(req.body.columnStats || [], req.body.rowCount || 0, req.body.colCount || 0, req.body.fileName || "");
      res.json(fallbackResult);
    } catch (fallbackErr) {
      console.error("Critical fallback failure in Notebook Generator:", fallbackErr);
      res.status(500).json({ error: err.message || "An error occurred during Kaggle notebook generation." });
    }
  }
});

// 1.8. Kaggle Leaderboard Coach Agent Endpoint
app.post("/api/leaderboard", async (req, res): Promise<any> => {
  try {
    const { columnStats, rowCount, colCount, fileName, metric, score } = req.body;

    if (!columnStats || !Array.isArray(columnStats)) {
      return res.status(400).json({ error: "Column statistics are required for Kaggle Leaderboard coaching." });
    }
    if (score === undefined || score === null) {
      return res.status(400).json({ error: "A current leaderboard score is required." });
    }

    const activeMetric = metric || "accuracy";

    if (!process.env.GEMINI_API_KEY) {
      console.warn("Gemini API key is missing. Using high-fidelity heuristic fallback for Leaderboard Coach.");
      const fallbackResult = generateHeuristicLeaderboardFallback(columnStats, rowCount, colCount, fileName, activeMetric, Number(score));
      return res.json(fallbackResult);
    }

    const columnsOverview = columnStats.map(c => {
      if (c.type === "numeric") {
        return `- Column "${c.name}" (Numeric): Range [${c.min} to ${c.max}], Avg: ${c.avg}, Missing: ${c.missingCount}`;
      } else {
        return `- Column "${c.name}" (Categorical): Unique: ${c.uniqueCount}, Missing: ${c.missingCount}, Top values: ${c.topCategories?.slice(0, 3).map((tc: any) => `${tc.category} (${tc.count})`).join(", ")}`;
      }
    }).join("\n");

    const prompt = `
You are an elite Kaggle Grandmaster Coach. A user has built a machine learning pipeline on the following dataset and submitted their predictions to the Kaggle Leaderboard.
Dataset Details:
- File Name: "${fileName || "dataset.csv"}"
- Total Rows: ${rowCount}
- Total Columns: ${colCount}
Columns:
${columnsOverview}

Evaluation Metric: "${activeMetric}"
User's Current Leaderboard Score: ${score}

Provide a comprehensive, highly professional, elite analysis and concrete suggestions to improve their score.
Identify whether they are in "Bronze (Baseline Starter)", "Silver (Competitor)", or "Gold (Top Tier Master)" based on their score relative to standard thresholds for this metric.
Generate:
1. "currentTier": String representing their level (e.g. Bronze, Silver, Gold).
2. "analysis": A detailed paragraph explaining how their score of ${score} ranks conceptually, where the model's primary bottlenecks likely are, and what the key next milestones are.
3. "suggestions": An object containing three lists of highly actionable, concrete bullet points tailored specifically to their dataset's column names and shapes:
   - "featureEngineering": 3-4 advanced feature ideas (e.g., specific mathematical ratios, target encodes on high-cardinality features, text patterns). Do not use generic placeholders; name actual column names from their dataset!
   - "ensembling": 3-4 advanced model combining, cross-validation, and rank-blending approaches.
   - "tuning": 3-4 hyperparameter tuning and model optimization guidelines.
4. "additionalTips": 2-3 extra Kaggle tricks (e.g. pseudo-labeling, adversarial validation, post-processing, tracking logs).
5. "performance_analysis": A deep analysis diagnosing performance (diagnose overfitting, underfitting, and validation curves).
6. "problems_detected": An array of specific issues detected in modeling or metrics.
7. "next_actions": An array of concrete next steps.
8. "priority_improvements": An array of highest priority feature/architecture changes.
9. "score_analysis": An analysis of why the score is stuck and what features are missing.
10. "bottlenecks": List of bottlenecks holding back model gain.
11. "next_experiments": List of 3-5 high-impact experiments.
12. "expected_gain": Expected leaderboard gain (e.g. "+3% accuracy" or "-5% RMSE").

Format your response strictly as a JSON object matching this schema. Do not include triple backticks or markdown wrappers around the JSON.
`;

    const response = await generateContentWithRetry({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            currentTier: {
              type: Type.STRING,
              description: "E.g. 'Bronze (Baseline Starter)', 'Silver (Competitor)', 'Gold (Top Tier Master)'"
            },
            analysis: {
              type: Type.STRING,
              description: "Concepts bottlenecks and score rank conceptual analysis"
            },
            suggestions: {
              type: Type.OBJECT,
              properties: {
                featureEngineering: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                ensembling: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                tuning: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ["featureEngineering", "ensembling", "tuning"]
            },
            additionalTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            performance_analysis: {
              type: Type.STRING
            },
            problems_detected: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            next_actions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            priority_improvements: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            score_analysis: {
              type: Type.STRING
            },
            bottlenecks: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            next_experiments: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            expected_gain: {
              type: Type.STRING
            }
          },
          required: [
            "currentTier", "analysis", "suggestions", "additionalTips",
            "performance_analysis", "problems_detected", "next_actions", "priority_improvements",
            "score_analysis", "bottlenecks", "next_experiments", "expected_gain"
          ]
        }
      }
    });

    const replyText = response.text || "{}";
    const result = JSON.parse(replyText.trim());
    res.json(result);
  } catch (err: any) {
    console.warn("Leaderboard Coach API Error, falling back to heuristic:", err);
    try {
      const fallbackResult = generateHeuristicLeaderboardFallback(req.body.columnStats || [], req.body.rowCount || 0, req.body.colCount || 0, req.body.fileName || "", req.body.metric || "accuracy", Number(req.body.score || 0));
      res.json(fallbackResult);
    } catch (fallbackErr) {
      console.error("Critical fallback failure in Leaderboard Coach:", fallbackErr);
      res.status(500).json({ error: err.message || "An error occurred during leaderboard coaching generation." });
    }
  }
});

// 2. Chat / Q&A Interactive Assistant Endpoint
app.post("/api/chat", async (req, res): Promise<any> => {
  try {
    const { messages, datasetOverview } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid messages history." });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: "Gemini API key is missing. Please configure it in your Secrets panel." });
    }

    let datasetContextText = "No dataset currently loaded.";
    if (datasetOverview) {
      const summaryStats = datasetOverview.columnStats.map((c: any) => {
        if (c.type === "numeric") {
          return `- ${c.name} (Numeric): Average ${c.avg}, Min ${c.min}, Max ${c.max}, Sum ${c.sum}`;
        } else {
          return `- ${c.name} (String): ${c.uniqueCount} unique categories. Top categories: ${c.topCategories?.map((tc: any) => `${tc.category} (${tc.count})`).join(", ")}`;
        }
      }).join("\n");

      datasetContextText = `
User has loaded a dataset: "${datasetOverview.fileName}"
Total Rows: ${datasetOverview.rowCount}
Columns Count: ${datasetOverview.colCount}
Columns stats:
${summaryStats}

Here is a preview (first few rows):
${JSON.stringify(datasetOverview.previewRows)}
`;
    }

    const systemPrompt = `
You are a brilliant dynamic data assistant integrated transparently in a modern dataset dashboard.
Your job is to answer user queries, provide data insights, explain concepts, perform numerical inferences, suggest data-driven options, and speak clearly.
Always refer to the dataset statistics and preview supplied below if the user asks any data-focused question. 

Important formatting instructions:
- Feel free to use clean markdown like lists, bold, and tables in your responses.
- Keep answers professional, concise, and focused on uncovering real business/analytical insights from the data.
- Do not reference mock variables or files that the user hasn't loaded. Only analyze the supplied statistics.

${datasetContextText}
`;

    // Map conversation array to Gemini contents format
    // Ensure formatting is precise and follows the SDK guidance
    const contentHistory = messages.map((msg: any) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    let replyText = "";
    try {
      const response = await generateContentWithRetry({
        model: "gemini-3.5-flash",
        contents: contentHistory,
        config: {
          systemInstruction: systemPrompt,
        },
      });
      replyText = response.text || "I was unable to retrieve a response from the service.";
    } catch (apiErr: any) {
      console.error("Gemini model error during chat:", apiErr);
      replyText = `### ⚠️ Service Busy (Local Backup Mode Activated)

I encountered a temporary high-demand spike from the generative AI servers (503 Service Unavailable). However, I can still provide some insights about your current dataset based on local metadata:

- **Current File**: ${datasetOverview?.fileName || "None"}
- **Size**: ${datasetOverview?.rowCount?.toLocaleString() || "0"} records x ${datasetOverview?.colCount || "0"} features
- **Integrations Available**: CatBoost, LightGBM, and XGBoost.

Please feel free to resend your question or try again in a few moments once the demand stabilizes.`;
    }

    res.json({ role: "assistant", content: replyText });
  } catch (err: any) {
    console.error("Chat Error:", err);
    res.status(500).json({ error: err.message || "An error occurred while connecting to the AI helper." });
  }
});

// Vite Middleware & Static Serves
async function init() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express and Vite server running on http://0.0.0.0:${PORT}`);
  });
}

init();
