import pandas as pd
import matplotlib.pyplot as plt
import numpy as np

# Đọc dữ liệu từ các file CSV
file_paths = {
    "Cosine Similarity": "experimental/top_5_Cosine Similarity.csv",
    "Euclidean Distance": "experimental/top_5_Euclidean Distance.csv",
    "Pearson Correlation": "experimental/top_5_Pearson Corr.csv",
}

dataframes = {key: pd.read_csv(path) for key, path in file_paths.items()}

# Đảo ngược thứ tự của Euclidean Distance để threshold tăng dần
dataframes["Euclidean Distance"] = dataframes["Euclidean Distance"].iloc[::-1].reset_index(drop=True)

# Vẽ biểu đồ
plt.figure(figsize=(16, 8))

# Lấy danh sách threshold
thresholds = dataframes["Cosine Similarity"]["Threshold"]

# Trích xuất RMSE
t1, t2, t3 = (dataframes["Cosine Similarity"],
              dataframes["Euclidean Distance"],
              dataframes["Pearson Correlation"])

rmse = {"Cosine Similarity": t1["RMSE"],
             "Euclidean Distance": t2["RMSE"],
             "Pearson Correlation": t3["RMSE"]}

# Xác định vị trí cột trên trục x
x = np.arange(len(thresholds))
width = 0.25

# Vẽ biểu đồ cột
plt.bar(x - width, rmse["Cosine Similarity"], width, label="Cosine Similarity")
plt.bar(x, rmse["Euclidean Distance"], width, label="Euclidean Distance")
plt.bar(x + width, rmse["Pearson Correlation"], width, label="Pearson Correlation")

# Gắn nhãn
plt.xlabel("Threshold")
plt.ylabel("RMSE")
plt.title("RMSE Across Different Thresholds")
plt.xticks(x, thresholds, rotation=45)
plt.yticks(np.arange(0.0, 1.1, 0.1))
plt.legend()
plt.grid(axis="y", linestyle="--", alpha=0.7)

# Điều chỉnh layout để tránh bị cắt nhãn
plt.tight_layout()

# Hiển thị biểu đồ
plt.show()
