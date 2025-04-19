from helper_functions import *
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from semantic_router import RouteLayer, Route
from semantic_router.encoders import OpenAIEncoder
from fastapi import FastAPI, File, UploadFile, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_FOLDER = "uploads"
VECTOR_FOLDER = "vector_stores"

for folder in [UPLOAD_FOLDER, VECTOR_FOLDER]:
    if not os.path.exists(folder):
        os.makedirs(folder)

active_vector_stores = {}


@app.post("/response")
def response(msg: str = Form(...), thread_id: str = Form(...), top_k: int = Form(3)):
    if thread_id not in active_vector_stores:
        vector_path = os.path.join(VECTOR_FOLDER, f"{thread_id}")
        if os.path.exists(vector_path):
            try:
                active_vector_stores[thread_id] = FAISS.load_local(
                    vector_path,
                    OpenAIEmbeddings(),
                    allow_dangerous_deserialization=True,
                )
            except Exception as e:
                return {
                    "response": f"Error loading previous conversation context: {str(e)}"
                }
        else:
            return {"response": "Please upload a PDF document first."}

    return {"response": get_chat_response(msg, thread_id, top_k)}


@app.post("/upload")
def upload_pdf(
    file: UploadFile = File(...), thread_id: str = Form(...), user_id: str = Form(...)
):
    user_folder = os.path.join(UPLOAD_FOLDER, user_id)
    if not os.path.exists(user_folder):
        os.makedirs(user_folder)

    file_path = os.path.join(user_folder, file.filename)
    with open(file_path, "wb") as f:
        f.write(file.file.read())

    try:
        vector_store = encode_pdf(file_path)
        vector_path = os.path.join(VECTOR_FOLDER, thread_id)
        vector_store.save_local(vector_path)

        active_vector_stores[thread_id] = vector_store

        save_document_metadata(thread_id, user_id, file.filename, file_path)

        return {
            "message": f"File {file.filename} uploaded and processed successfully.",
            "file_path": file_path,
        }
    except Exception as e:
        return {"message": f"Error processing file: {str(e)}"}


@app.post("/pdf_info")
def get_pdf_info(thread_id: str = Form(...)):
    metadata_file = os.path.join(VECTOR_FOLDER, "document_metadata.json")
    if os.path.exists(metadata_file):
        with open(metadata_file, "r") as f:
            metadata = json.load(f)

        if thread_id in metadata:
            return metadata[thread_id]

    return {"error": "Document not found"}


@app.post("/user_pdfs")
def get_user_pdfs(user_id: str = Form(...)):
    try:
        metadata_file = os.path.join(VECTOR_FOLDER, "document_metadata.json")
        user_pdfs = []

        if os.path.exists(metadata_file):
            with open(metadata_file, "r") as f:
                metadata = json.load(f)

            # Filter documents by user_id
            for thread_id, doc_metadata in metadata.items():
                if doc_metadata.get("user_id") == user_id:
                    user_pdfs.append(
                        {
                            "filename": doc_metadata.get("filename", "Unknown"),
                            "thread_id": thread_id,
                            "upload_date": doc_metadata.get("timestamp", None),
                        }
                    )

        return {"pdfs": user_pdfs}
    except Exception as e:
        return {"error": str(e), "pdfs": []}


def save_document_metadata(thread_id, user_id, filename, file_path):
    metadata_file = os.path.join(VECTOR_FOLDER, "document_metadata.json")
    metadata = {}

    if os.path.exists(metadata_file):
        with open(metadata_file, "r") as f:
            metadata = json.load(f)

    metadata[thread_id] = {
        "user_id": user_id,
        "filename": filename,
        "file_path": file_path,
    }

    with open(metadata_file, "w") as f:
        json.dump(metadata, f, indent=2)


rag_template = """
Use only the following context to answer the user's query in a well-formatted, concise, and clear manner sentences. If the query is related to the provided PDF document but the answer is not found in it, respond with: "The PDF document you provided does not contain information for your question!".  

Câu hỏi:  
{question}  

Trả lời:  
{context}  
"""
summarize_template = """" \
If the user ask you to summarize the content of the PDF document, Use the following context to answer the user's query in a well-formatted, concise, and clear manner sentences.

Câu hỏi:
{question}
"""

normal_template = """
You are a chatbot that helping user analyze and summarize information from a PDF file. Respond appropriately based on the type of input:

- If the user greets you (e.g., "hello", "hi", "good morning"), respond with a friendly and engaging greeting.
- If the user asks what you can do or who you are, respond with: "I am ChatPDF. I can help you analyze and summarize information from a PDF file. You can upload a PDF, and I'll assist with answering questions and summarizing its content."
- If the user thanks you, respond politely and warmly.
- If the user asks unkind or offensive questions, respond with: "I'm sorry, I can't help with that. Please be kind and respectful!."
- If the user asks a question that is not related to the PDF document, respond with: "Please provide a PDF document, so I can help you analyze and summarize its content."

Câu hỏi:  
{question}
"""

rag_prompt = ChatPromptTemplate.from_template(rag_template)
normal_prompt = ChatPromptTemplate.from_template(normal_template)
summarize_prompt = ChatPromptTemplate.from_template(summarize_template)
chat_model = ChatOpenAI(model_name="gpt-4o-mini", temperature=0)

routes = [
    Route(
        name="chitchat",
        utterances=[
            "Hello",
            "Hi",
            "Good morning",
            "Hey",
            "Thank you",
            "Thanks",
            "Appreciate it",
            "Who are you?",
            "What can you do?",
            "What are you?",
            "How are you?",
            "Nice to meet you",
        ],
    ),
    Route(
        name="summarize",
        utterances=[
            "Can you summarize the content of the PDF document?",
            "What is the summary of the PDF document?",
            "Can you provide a summary of the PDF document?",
            "Summarize the PDF document",
        ],
    ),
]

rl = RouteLayer(encoder=OpenAIEncoder(), routes=routes)


def get_chat_response(text: str, thread_id: str, top_k: int):
    text = preprocess(text)
    route = rl(text).name

    if route == "chitchat":
        normal_chain = normal_prompt | chat_model | StrOutputParser()
        return normal_chain.invoke({"question": text})
    elif route == "summarize":
        metadata_file = os.path.join(VECTOR_FOLDER, "document_metadata.json")
        if os.path.exists(metadata_file):
            with open(metadata_file, "r") as f:
                metadata = json.load(f)

            if thread_id in metadata and "file_path" in metadata[thread_id]:
                file_path = metadata[thread_id]["file_path"]
                summarize_chain = summarize_prompt | chat_model | StrOutputParser()
                return summarize_chain.invoke(
                    {"question": read_pdf_to_string(file_path)}
                )

        return "Please upload a PDF document first to summarize it."
    else:
        if thread_id not in active_vector_stores:
            return "Please upload a PDF document first."

        vector_store = active_vector_stores[thread_id]
        chunks_query_retriever = vector_store.as_retriever(search_kwargs={"k": top_k, "score_threshold": 0.75})

        related_chunks = chunks_query_retriever.get_relevant_documents(text)
        answer = "\n\n".join([chunk.page_content for chunk in related_chunks])

        semantic_rag_chain = rag_prompt | chat_model | StrOutputParser()

        return semantic_rag_chain.invoke({"context": answer, "question": text})


if __name__ == "__main__":
    uvicorn.run(app, host="localhost", port=8000)
