from sklearn.metrics import accuracy_score
from rouge_score import rouge_scorer
import pandas as pd
import numpy as np


def calculate_metrics(y_true, y_pred):
    accuracy = accuracy_score(y_true, y_pred)

    # Convert boolean/int predictions to strings for ROUGE calculation
    y_true_str = ["1" if y else "0" for y in y_true]
    y_pred_str = ["1" if y else "0" for y in y_pred]

    # Initialize rouge scorer with the metrics we want to calculate
    scorer = rouge_scorer.RougeScorer(["rouge1"], use_stemmer=True)

    # Calculate ROUGE scores
    rouge_scores = scorer.score(" ".join(y_true_str), " ".join(y_pred_str))

    # Extract precision, recall, and F1 from ROUGE scores
    precision = rouge_scores["rouge1"].precision
    recall = rouge_scores["rouge1"].recall
    f1_score = rouge_scores["rouge1"].fmeasure

    return accuracy, precision, recall, f1_score


# Load results from CSV
results_df = pd.read_csv("../experimental/result.csv")
datasets = {
    "top_1": results_df[:1017],
    "top_3": results_df[1017:2032],
    "top_5": results_df[2032:],
}

# Calculate metrics
metrics = ["Cosine similarity"]
thresholds = np.arange(0.3, 1, 0.01).round(2)

for dataset_name, dataset in datasets.items():
    for metric in metrics:
        result = []

        for threshold in thresholds:
            y_true = []
            y_pred = []

            for _, row in dataset.iterrows():
                if (
                    row["Chatbot answer"]
                    == "The PDF document you provided does not contain information for your question!"
                ):
                    continue

                y_true.append(1)
                y_pred.append(int(row[f"{metric}"] >= threshold))
                # y_pred.append(int(row[f"{metric}"] <= threshold))

            # Skip if no predictions
            if len(y_true) == 0:
                continue

            # Compute evaluation metrics
            accuracy, precision, recall, f1_score = calculate_metrics(y_true, y_pred)

            result.append([threshold, accuracy, precision, recall, f1_score])

        # Save results to CSV
        df = pd.DataFrame(
            result, columns=["Threshold", "Accuracy", "Precision", "Recall", "F1-Score"]
        )
        output_path = f"../experimental/{dataset_name}_{metric}.csv"
        df.to_csv(output_path, index=False, encoding="utf-8")
        print(f"Results saved to {output_path}")
