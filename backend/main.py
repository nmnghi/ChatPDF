import os
import fitz
from dotenv import load_dotenv 
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_experimental.text_splitter import SemanticChunker

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_FOLDER = "uploads"
db_vectors = None

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

OPEN_API_KEY = os.getenv("OPEN_API_KEY")

@app.post("/response")
def response(msg: str = Form(...)):
    return {"response": get_chat_response(msg)}

@app.post("/upload")
def upload_pdf(file: UploadFile = File(...)):
    global db_vectors
    
    filename = file.filename
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    with open(filepath, "wb") as buffer:
        buffer.write(file.file.read())

    content = read_pdf_to_string(filepath)

    embeddings = OpenAIEmbeddings(api_key=OPEN_API_KEY)
    docs = chunking(content, embeddings)
    db_vectors = FAISS.from_documents(docs, embeddings)

    return {"message": "File uploaded and processed successfully"}

def read_pdf_to_string(filepath):
    doc = fitz.open(filepath)
    content = ""
    for page in doc:
        content += page.get_text()
    return content

def chunking(content, embeddings):
    text_splitter = SemanticChunker(
        embeddings,
        breakpoint_threshold_type="percentile",
        breakpoint_threshold_amount=90,
        min_chunk_size=100
    )
    return text_splitter.create_documents([content])

rag_template = """
Use only the following context to answer the user's query in a well-formatted, concise, and clear manner paragraph. If you don't have an answer, respond "Tài liệu pdf mà bạn cung cấp không có thông tin cho câu hỏi của bạn!".

Câu hỏi:
{question}

Trả lời:
{context}
"""

rag_prompt = ChatPromptTemplate.from_template(rag_template)
chat_model = ChatOpenAI(model_name="gpt-4o-mini", temperature=0, openai_api_key=OPEN_API_KEY)

def get_chat_response(text: str):
    if db_vectors:
        chunks_query_retriever = db_vectors.as_retriever(
            search_kwargs={"k": 5, "score_threshold": 0.7}
        )
        semantic_rag_chain = (
            {"context": chunks_query_retriever, "question": RunnablePassthrough()}
            | rag_prompt
            | chat_model
            | StrOutputParser()
        )
        return semantic_rag_chain.invoke(text)
    else:
        return chat_model.invoke(text).content
