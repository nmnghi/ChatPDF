from sklearn.metrics import accuracy_score, precision_recall_fscore_support, mean_squared_error
from scipy.stats import pearsonr
from helper_functions import *
import pandas as pd
import numpy as np
import requests
import time

# Load dataset
df = pd.read_excel("experimental/dataset.xlsx")

# API endpoint for chatbot
API_URL = "http://localhost:8000/response"

# Store results
results = []

# Different top_k values
top_k_values = [1, 3, 5]

for top_k in top_k_values:
    for index, row in df.iterrows():
        question = row["Question"]
        ground_truth = row["Answer"]

        # Query chatbot
        start_time = time.time()
        response = requests.post(API_URL, data={"msg": question, "top_k": top_k}).json()
        chatbot_answer = response.get("response", "")
        response_time = time.time() - start_time

        # Compute embeddings
        ground_truth_emb = encoding(ground_truth)
        chatbot_answer_emb = encoding(chatbot_answer)

        # Compute similarities
        cosine_sim = cosine_similarity(ground_truth_emb, chatbot_answer_emb)
        euclid_dist = euclid_distance(ground_truth_emb, chatbot_answer_emb)
        pearson_corr, _ = pearsonr(ground_truth_emb, chatbot_answer_emb)

        results.append([top_k, question, ground_truth, chatbot_answer, cosine_sim, euclid_dist, pearson_corr, response_time])

# Save results to CSV
results_df = pd.DataFrame(results, columns=["Top k", "Question", "Ground truth", "Chatbot answer", "Cosine similarity", "Euclidean Distance", "Pearson Corr", "Response time"])
results_df.to_csv("experimental/result2.csv", index=False, encoding="utf-8")

#====================================================================#
#----------------------------Calculate Metrics-----------------------#
#====================================================================#

# def calculate_metrics(y_true, y_pred):
#     accuracy = accuracy_score(y_true, y_pred)
#     precision, recall, f1_score, _ = precision_recall_fscore_support(y_true, y_pred, average="binary", zero_division=1)
#     rmse = np.sqrt(mean_squared_error(y_true, y_pred))
#     return accuracy, precision, recall, f1_score, rmse

# # Load results from CSV
# results_df = pd.read_csv("experimental/result2.csv")
# datasets = {
#     "top_1": results_df[:200],
#     "top_3": results_df[200:400],
#     "top_5": results_df[-200:]
# }

# # Calculate metrics
# metrics = ["Cosine similarity", "Euclidean Distance", "Pearson Corr"]
# thresholds = np.arange(0, 1.02, 0.02).round(2)

# for dataset_name, dataset in datasets.items():
#     for metric in metrics:
#         result = []

#         for threshold in thresholds:
#             y_true = []
#             y_pred = []

#             for _, row in dataset.iterrows():
#                 y_true.append(1)
                
#                 # Kiểm tra nếu câu trả lời không có thông tin
#                 if row["Chatbot answer"] == "The PDF document you provided does not contain information for your question!":
#                     y_pred.append(0)
#                 else:
#                     # Tính toán y_pred dựa trên ngưỡng như bình thường
#                     if metric != "Euclidean Distance":
#                         y_pred.append(int(row[f"{metric}"] >= threshold))
#                     else:
#                         adjust_threshold = round(1 - threshold, 2)
#                         y_pred.append(int(row[f"{metric}"] <= adjust_threshold))

#             # Compute evaluation metrics
#             accuracy, precision, recall, f1_score, rmse = calculate_metrics(y_true, y_pred)

#             if metric != "Euclidean Distance":
#                 result.append([threshold, accuracy, precision, recall, f1_score, rmse])
#             else:
#                 result.append([adjust_threshold, accuracy, precision, recall, f1_score, rmse])

#         # Save results to CSV
#         df = pd.DataFrame(result, columns=["Threshold", "Accuracy", "Precision", "Recall", "F1-Score", "RMSE"])
#         df.to_csv(f"experimental/{dataset_name}_{metric}.csv", index=False, encoding="utf-8")