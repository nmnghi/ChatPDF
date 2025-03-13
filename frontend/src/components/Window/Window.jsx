import { useState, useRef, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../../firebase.config';
import { assets } from '../../assets/assets';
import Avatar from '../../assets/chatpdf_avatar.json';
import Sidebar from '../Sidebar/Sidebar';
import Lottie from 'lottie-react';
import './Window.css';
import { Worker } from '@react-pdf-viewer/core';
import { Viewer } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

const Window = () => {
  const [input, setInput] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [file, setFile] = useState(null);
  const [pdf, setPdf] = useState(null);
  const fileInputRef = useRef(null);
  const [currentThread, setCurrentThread] = useState(null);
  const [userId, setUserId] = useState(null);
  const [currentPdfName, setCurrentPdfName] = useState(null);
  const [showPdfList, setShowPdfList] = useState(false);
  const [userPdfs, setUserPdfs] = useState([]);
  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUserId(user.uid);
      }
    });
    
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loadPDFTitle = async () => {
      if (currentThread) {
        try {
          const pdfInfoFormData = new FormData();
          pdfInfoFormData.append("thread_id", currentThread);
          
          const pdfInfoResponse = await fetch("http://127.0.0.1:8000/pdf_info", {
            method: "POST",
            body: pdfInfoFormData,
          });
          
          const pdfInfo = await pdfInfoResponse.json();
          if (pdfInfo.filename) {
            setCurrentPdfName(pdfInfo.filename);
          } else {
            setCurrentPdfName(null);
          }
        } catch (error) {
          console.error("Error loading document for thread:", error);
        }
      }
    };
    
    loadPDFTitle();
  }, [currentThread]);

  const createMsgElement = (content, type) => ({
    id: Date.now(),
    type,
    content
  });

  const typingEffect = (text, delay) => {
    return new Promise((resolve) => {
      let index = 0;
      let typingMessage = "";
  
      const interval = setInterval(() => {
        if (index < text.length) {
          typingMessage += text[index];
          index++;
        } else {
          clearInterval(interval);
          console.log(chatHistory);
          resolve();
        }
  
        setChatHistory((prevMessages) => {
          const updatedMessages = [...prevMessages];
          updatedMessages[updatedMessages.length - 1] = createMsgElement(typingMessage, "bot");
          return updatedMessages;
        });
      }, delay);
    });
  }

  const sendMessage = async () => {
    try {
      if (!currentThread) {
        return "Please select or create a conversation first.";
      }
      
      const formData = new FormData();
      formData.append("msg", input);
      formData.append("thread_id", currentThread);
      
      const res = await fetch("http://127.0.0.1:8000/response", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      return data.response.replace(/\*\*([^*]+)\*\*/g, "$1");
    } catch (error) {
      console.error("Error fetching response:", error);
      return "Sorry, I encountered an error processing your request.";
    }
  }

  const onHandleSubmit = async (e) => {
    e.preventDefault();
    const userMessage = input.trim();
    if (!userMessage) return;

    if (!currentThread) {
      alert("Please select or create a conversation first.");
      return;
    }

    setInput('');
    const userMsg = createMsgElement(userMessage, 'user');
    setChatHistory((prevMessages) => [...prevMessages, userMsg]);

    try {
      const botResponse = await sendMessage();
      if (botResponse) {
        const botMsg = createMsgElement(botResponse, 'bot');
        typingEffect(botResponse, 15);
        setChatHistory((prevMessages) => {
          const updatedHistory = [...prevMessages, botMsg];
          updateThreadContent(updatedHistory);
          return updatedHistory;
        });
      } else {
        console.error('Bot response is undefined or null');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }

  const handleButtonClick = () => {
    fileInputRef.current.click();
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      let reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onloadend = (e) => {
        setPdf(e.target.result);
      }
    }
  };

  const uploadFile = async (file) => {
    if (!file || !currentThread || !userId) {
      alert("Please ensure you are logged in and have selected a conversation.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("thread_id", currentThread);
      formData.append("user_id", userId);
      
      const res = await fetch("http://127.0.0.1:8000/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      
      if (data.filename) {
        setCurrentPdfName(data.filename);
      }
      
      alert(data.message);
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Error uploading file.");
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); 
      onHandleSubmit(e);
    }
  }

  const onHandleDelete = () => {
    setInput('');
  }

  const updateChatHistory = (newChatHistory) => {
    setChatHistory(newChatHistory);
  }

  const updateCurrentThread = (threadId) => {
    setCurrentThread(threadId);
    // Clear current PDF name until we fetch the new one
    setCurrentPdfName(null);
  }

  const updateThreadContent = async (updatedHistory) => {
    if (!currentThread){
      console.log("No thread selected");
      return;
    }
    console.log("Updating thread content...");
    const threadRef = doc(db, 'threads', currentThread)
    try{
      await updateDoc(threadRef, {
        contents: updatedHistory
      });
      console.log("Thread content updated successfully");
    } catch (e) {
      console.error("Error updating thread content:", e);
    }
  }

  const togglePdfList = async () => {
    setShowPdfList(!showPdfList);
    
    if (!showPdfList && userId) {
      try {
        const formData = new FormData();
        formData.append("user_id", userId);
        
        const response = await fetch("http://127.0.0.1:8000/user_pdfs", {
          method: "POST",
          body: formData,
        });
        
        const data = await response.json();
        if (data.pdfs) {
          setUserPdfs(data.pdfs);
        }
      } catch (error) {
        console.error("Error fetching user PDFs:", error);
        setUserPdfs([]);
      }
    }
  };

  return (
    <>
      <div>
        <Sidebar updateChatHistory={updateChatHistory} updateCurrentThread={updateCurrentThread} />
      </div>
      <div className='main'>
        <div className="nav">
          <div className="nav-left">
            <p>ChatPDF</p>
            {currentPdfName && (
              <div className="current-pdf">
                <span className="material-symbols-outlined">description</span>
                <p>{currentPdfName}</p>
              </div>
            )}
          </div>
          <div className="nav-right">
            <button 
              className="pdf-list-btn material-symbols-outlined" 
              onClick={togglePdfList}
              title="My PDFs"
            >
              folder
            </button>
            <img src={assets.user_icon} alt="Avatar" />
          </div>
        </div>

        {/* PDF List Dropdown */}
        {showPdfList && (
          <div className="pdf-list-dropdown">
            <div className="pdf-list-header">
              <h3>My PDFs</h3>
              <button className="close-btn material-symbols-outlined" onClick={togglePdfList}>
                close
              </button>
            </div>
            <div className="pdf-list-content">
              {userPdfs && userPdfs.length > 0 ? (
                <ul className="pdf-list">
                  {userPdfs.map((pdf, index) => (
                    <li key={index} className="pdf-item">
                      <span className="material-symbols-outlined pdf-icon">description</span>
                      <p>{pdf.filename}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="no-pdfs">No PDFs uploaded yet</p>
              )}
            </div>
          </div>
        )}

        <div className="main-container">
          {/* <div className="pdf-container">
              <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
                {pdf && <Viewer fileUrl={pdf} plugins={[defaultLayoutPluginInstance]} />}
              </Worker>
          </div> */}
          <div className="chats-container">
            {chatHistory.map((msg, index) => (
              <div key={index} className={`message ${msg.type}-message ${msg.type === "bot" ? "loading" : ""}`}>
                {msg.type === "bot" ? (
                  <>
                    <Lottie className="avatar" animationData={Avatar} />
                    <p className="message-text">{msg.content || "Loading..."}</p>
                  </>
                ) : (
                  <p className="message-text">{msg.content}</p>
                )}
              </div>
            ))}
          </div>

          <div className="prompt-container">
            <div className='prompt-wrapper'>
              <div className='prompt-search'>
                <input
                  className='prompt-input'
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={currentPdfName ? 'Ask anything about this file' : 'Upload a PDF file first'}
                  required
                />
                <div className='prompt-actions'>
                  <div>
                    <button
                      id='add-file-btn'
                      className="material-symbols-outlined"
                      onClick={handleButtonClick}
                      title={currentPdfName ? "Replace PDF" : "Upload PDF"}
                    >
                      attach_file
                    </button>
                    <input
                      type="file"
                      accept=".pdf"
                      ref={fileInputRef}
                      style={{ display: "none" }}
                      onChange={handleFileChange}
                    />
                  </div>
                  <button
                    id='send-btn'
                    className="material-symbols-outlined"
                    onClick={onHandleSubmit}
                  >
                    send
                  </button>
                </div>
              </div>
              <button id='theme-toggle-btn' className="material-symbols-outlined">light_mode</button>
              <button id='delete-btn' className="material-symbols-outlined" onClick={onHandleDelete}>delete</button>
            </div>

            <p className='bottom-info'>
              {currentPdfName 
                ? `Current PDF: ${currentPdfName}`
                : "Please upload a PDF document to start chatting"}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Window;