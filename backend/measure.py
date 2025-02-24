from sklearn.metrics import accuracy_score, precision_recall_fscore_support, root_mean_squared_error
from helper_functions import *
import pandas as pd
import requests

# Load dataset
train_path = "experimental/dataset2.xlsx"
df = pd.read_excel(train_path).head(5)

# API endpoint for chatbot
API_URL = "http://localhost:8000/response"

# Store results
y_true = []
y_pred = []
results = []

for index, row in df.iterrows():
    question = row["Question"]
    ground_truth = row["Answer"]

    # Query chatbot
    response = requests.post(API_URL, data={"msg": question}).json()
    chatbot_answer = response.get("response", "")

    # Get embeddings
    ground_truth_emb = encoding(ground_truth)
    chatbot_answer_emb = encoding(chatbot_answer)

    # Compute similarity
    similarity = cosine_similarity(ground_truth_emb, chatbot_answer_emb)

    # Define similarity threshold
    is_correct = similarity >= 0.8

    y_true.append(1)  # Ground truth is always 1 (correct)
    y_pred.append(1 if is_correct else 0)  # 1 if chatbot's answer is correct, else 0

    # Save result
    results.append([question, ground_truth, chatbot_answer, similarity])

# Compute Metrics
accuracy = accuracy_score(y_true, y_pred)
precision, recall, f1, _ = precision_recall_fscore_support(y_true, y_pred, average='binary')
RMSE = root_mean_squared_error(y_true, y_pred)

# Save results to CSV
results_df = pd.DataFrame(results, columns=["Query", "Ground Truth", "Chatbot Response", "Cosine Similarity"])
results_df.to_csv("experimental/chatbot_evaluation_results.csv", index=False, encoding="utf-8")

# Print results
print(f"Accuracy: {accuracy:.2f}")
print(f"Precision: {precision:.2f}")
print(f"Recall: {recall:.2f}")
print(f"F1-score: {f1:.2f}")
print(f"RMSE: {RMSE:.2f}")