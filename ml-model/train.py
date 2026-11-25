import pandas as pd
import joblib

from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GroupShuffleSplit
from sklearn.metrics import classification_report

# Load dataset
data = pd.read_csv("questions.csv")

X = data["text"]
y = data["intent"]
groups = data["phrase_family"]

# Separate training and testing data
splitter = GroupShuffleSplit(
    n_splits=1,
    test_size=0.25,
    random_state=42
)

train_idx, test_idx = next(
    splitter.split(
        X.to_frame(),
        y=y,
        groups=groups
    )
)

X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]

# Create ML pipeline
model = Pipeline([
    ("tfidf", TfidfVectorizer(
        lowercase=True,
        ngram_range=(1, 2)
    )),
    ("classifier", LogisticRegression(
        max_iter=1000,
        class_weight="balanced"
    ))
])

# Train
model.fit(X_train, y_train)

# Evaluate
predictions = model.predict(X_test)

print(classification_report(
    y_test,
    predictions,
    zero_division=0
))

# Save model
joblib.dump(model, "model.pkl")

print("Model successfully trained!")