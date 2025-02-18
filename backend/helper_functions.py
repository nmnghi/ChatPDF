import re
import fitz
from langchain_experimental.text_splitter import SemanticChunker
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS

def preprocess(text):
    # Lower query
    text = text.lower()
    # Remove special characters
    text = re.sub(r'[^\w\s]', '', text)
    # Remove white space
    text = text.strip()
    return text

def read_pdf_to_string(filepath):
    doc = fitz.open(filepath)
    text = ""
    for page_num in range(len(doc)):
        page = doc[page_num]
        text += page.get_text()
    return text

def chunking(text, embeddings):
    text_splitter = SemanticChunker(
        embeddings,
        breakpoint_threshold_type="percentile",
        breakpoint_threshold_amount= 90,
        min_chunk_size=30
    )
    return text_splitter.create_documents([text])

def encode_pdf(path):
    text = read_pdf_to_string(path)
    embeddings = OpenAIEmbeddings()
    docs = chunking(text, embeddings)
    vector_store = FAISS.from_documents(docs, embeddings)
    return vector_store