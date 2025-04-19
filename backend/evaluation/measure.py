from helper_functions import *
from scipy.stats import pearsonr
from functools import partial
import multiprocessing
import pandas as pd
import requests
import time
import numpy as np

# Load dataset
df = pd.read_excel("experimental/dataset.xlsx")

# API endpoint for chatbot
API_URL = "http://localhost:8000/response"

# Different top_k values
top_k_values = [3, 5]


def process_row(row, top_k):
    """Process a single row from the dataset with specified top_k value"""
    question = row["Question"]
    ground_truth = row["Answer"]

    # Query chatbot
    start_time = time.time()
    try:
        response = requests.post(API_URL, data={"msg": question, "top_k": top_k}).json()
        chatbot_answer = response.get("response", "")
    except Exception as e:
        print(f"Error processing question: {question}, error: {str(e)}")
        chatbot_answer = ""
    response_time = time.time() - start_time

    # Compute embeddings
    ground_truth_emb = encoding(ground_truth)
    chatbot_answer_emb = encoding(chatbot_answer)

    # Compute similarities
    cosine_simi = cosine_similarity(ground_truth_emb, chatbot_answer_emb)
    euclid_dist = euclid_distance(ground_truth_emb, chatbot_answer_emb)

    try:
        # Try the new way (returning only the correlation coefficient)
        pearson_corr, _ = pearsonr(ground_truth_emb, chatbot_answer_emb)
    except ValueError:
        try:
            # Try the old way (returning correlation and p-value)
            pearson_corr, _ = pearsonr(ground_truth_emb, chatbot_answer_emb)
        except Exception as e:
            # Fallback to using numpy's corrcoef if scipy fails
            print(f"Pearson correlation error: {str(e)}")
            corr_matrix = np.corrcoef(ground_truth_emb, chatbot_answer_emb)
            pearson_corr = corr_matrix[0, 1]

    return [
        top_k,
        question,
        ground_truth,
        chatbot_answer,
        cosine_simi,
        euclid_dist,
        pearson_corr,
        response_time,
    ]


def process_dataset_chunk(chunk_df, top_k):
    """Process a chunk of the dataset with the specified top_k value"""
    return [process_row(row, top_k) for _, row in chunk_df.iterrows()]


if __name__ == "__main__":
    results = []
    # Number of processes to use (adjust based on CPU cores)
    num_processes = multiprocessing.cpu_count() - 1 or 1

    # Split dataset into chunks
    chunk_size = max(1, len(df) // num_processes)
    chunks = [df.iloc[i : i + chunk_size] for i in range(0, len(df), chunk_size)]

    for top_k in top_k_values:
        print(f"Processing with top_k = {top_k}...")

        # Create a pool of workers
        with multiprocessing.Pool(processes=num_processes) as pool:
            # Process each chunk in parallel
            chunk_results = pool.map(
                partial(process_dataset_chunk, top_k=top_k), chunks
            )

            # Flatten the results
            for chunk_result in chunk_results:
                results.extend(chunk_result)

        print(f"Finished processing with top_k = {top_k}")

    # Save results to CSV
    results_df = pd.DataFrame(
        results,
        columns=[
            "Top k",
            "Question",
            "Ground truth",
            "Chatbot answer",
            "Cosine Distance",
            "Euclidean Distance",
            "Pearson Corr",
            "Response time",
        ],
    )
    if os.path.exists("experimental/result.csv"):
        results_df.to_csv(
            "experimental/result.csv",
            index=False,
            encoding="utf-8",
            mode="a",
            header=False,
        )
    else:
        results_df.to_csv("experimental/result.csv", index=False, encoding="utf-8")

    print(f"Results saved to experimental/result.csv")
