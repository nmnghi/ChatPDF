import { useState, useRef, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../../firebase.config';
import { assets } from '../../assets/assets';
import Avatar from '../../assets/chatpdf_avatar.json';
import TextareaAutosize from 'react-textarea-autosize'
import Sidebar from '../Sidebar/Sidebar';
import Help from '../Help/Help';
import Lottie from 'lottie-react';
import './Window.css';
import { marked } from "marked";

const Window = () => {
  const [input, setInput] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);
  const [currentThread, setCurrentThread] = useState(null);
  const [userId, setUserId] = useState(null);
  const [currentPdfName, setCurrentPdfName] = useState(null);
  const [showPdfList, setShowPdfList] = useState(false);
  const [userPdfs, setUserPdfs] = useState([]);
  const [showHelp, setShowHelp] = useState(false); 
  const [showResult, setShowResult] = useState(false); 
  const [isLoading, setIsLoading] = useState(false);
  const textRef = useRef(null);

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
          setCurrentPdfName(pdfInfo.filename);
        } catch (error) {
          console.error("Error loading document for thread:", error);
        }
      }
    };
    
    loadPDFTitle();
  }, [currentThread]);

  const createMsgElement = (content, type, loading = false) => ({
    id: Date.now(),
    type,
    content,
    loading
  });

  

  const copyToClipboard = async () => {
    if (textRef.current) {
      try {
        await navigator.clipboard.writeText(textRef.current.textContent);
        // alert('Đã copy thành công!');
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const formatMarkdownToHTML = (response) => {
    let responseArray = response.split("**");
    let newResponse = "";  
    
    for (let i = 0; i < responseArray.length; i++) {
      if (i % 2 === 0) { 
        newResponse += responseArray[i]; 
      } else { 
        newResponse += `<b>${responseArray[i]}</b>`;
      }
    }
    return marked(newResponse); 
  };

  const adjustPromptSearchHeight = () => {
    const promptSearch = document.querySelector('.prompt-search');
    const textarea = document.querySelector('.prompt-input');
  
    if (promptSearch && textarea) {
      const newHeight = textarea.scrollHeight;
      const maxHeight = 260;
      const initialHeight = 130; 
  
      if (textarea.value.trim() === "") {
        promptSearch.style.height = `${initialHeight}px`;
        promptSearch.style.overflowY = 'hidden';
      } else if (newHeight + 80 > maxHeight) {
        promptSearch.style.height = `${maxHeight}px`;
        promptSearch.style.overflowY = 'auto';
      } else {
        promptSearch.style.height = `${newHeight + 80}px`;
        promptSearch.style.overflowY = 'hidden';
      }
    }
  };
  
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
      const response = data.response;
      const htmlContent = formatMarkdownToHTML(response);
      return htmlContent;
      // return data.response.replace(/\*\*([^*]+)\*\*/g, "$1");
    } catch (error) {
      console.error("Error fetching response:", error);
      return "Sorry, I encountered an error processing your request.";
    }
  }

  const onHandleSubmit = async (e) => {
    e.preventDefault();
    setShowResult(true);
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
      setIsLoading(true);
      const loadingMsg = createMsgElement("", 'bot', true);
      setChatHistory((prevMessages) => [...prevMessages, loadingMsg]);
      
      const botResponse = await sendMessage();
      
      setIsLoading(false);
      if (botResponse) {
        setChatHistory((prevMessages) => {
          const filteredMessages = prevMessages.filter(msg => !msg.loading);
          const botMsg = createMsgElement(botResponse, 'bot');
          const updatedHistory = [...filteredMessages, botMsg];
          updateThreadContent(updatedHistory);
          typingEffect(botResponse, 15);
          return updatedHistory;
        });
      } else {
        console.error('Bot response is undefined or null');
        setChatHistory((prevMessages) => 
          prevMessages.filter(msg => !msg.loading)
        );
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
      setChatHistory((prevMessages) => 
        prevMessages.filter(msg => !msg.loading)
      );
    }
  }

  const handleButtonClick = () => {
    fileInputRef.current.click();
  }

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      await uploadFile(selectedFile);
      setCurrentPdfName(selectedFile.name);
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
    const promptSearch = document.querySelector('.prompt-search');
    if (promptSearch) {
      promptSearch.style.height = '130px';
      // promptSearch.style.overflowY = 'hidden';
    }
  }

  const updateChatHistory = (newChatHistory) => {
    setChatHistory(newChatHistory);
  }

  const updateCurrentThread = (threadId) => {
    setCurrentThread(threadId);
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

  const handleHelpClick = () => {
    setShowHelp(prev => !prev);
  }

  return (
    <>
      <div>
        <Sidebar updateChatHistory={updateChatHistory} updateCurrentThread={updateCurrentThread} onHelpClick={handleHelpClick} showResult={showResult} setShowResult={setShowResult}/>
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
            <img className='user-avatar' src={assets.user_icon} alt="Avatar" />
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

        {showHelp ? 
        (<Help/>
        ) : (
          <div className="main-container">
            {!showResult ?
            <>
          <div className="greet">
            <p><span>Hello, Dev.</span></p>
            <p>How can I help you today?</p>
          </div>
          <div className="suggestions">
            <div className="suggestion-item">
              <p>What are the key points from my uploaded PDF file?</p>
              <span className="material-symbols-outlined">star</span>
            </div>

            <div className="suggestion-item">
              <p>Can you summarize my document in a clear, concise way?</p>
              <span className="material-symbols-outlined">lightbulb</span>
            </div>

            <div className="suggestion-item">
              <p>Help me find answers to specific questions in my PDF.</p>
              <span className="material-symbols-outlined">explore</span>
            </div>

            <div className="suggestion-item">
              <p>Highlight the most relevant sections of my document.</p>
              <span className="material-symbols-outlined">draw</span>
            </div>
          </div>
            </>:
            <>
              <div className="chats-container">
                {chatHistory.map((msg, index) => (
                  <div key={index} className={`message ${msg.type}-message`}>
                    {msg.type === "bot" ? (
                      <>
                        <Lottie className="avatar" animationData={Avatar} />
                        {msg.loading ? (
                          <div className="loading-animation">
                            <div className="dot-pulse"></div>
                          </div>
                        ) : (
                          <div>
                            <div 
                              ref={textRef} 
                              className="message-text" 
                              style={{ lineHeight: "1.5" }}
                              dangerouslySetInnerHTML={{ __html: msg.content }} 
                            />
                            <div className="message-icon">
                              <span className="material-symbols-outlined" onClick={copyToClipboard}>content_copy</span>
                              <span className="material-symbols-outlined">thumb_up</span>
                              <span className="material-symbols-outlined">thumb_down</span>
                              <span className="material-symbols-outlined">refresh</span>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="message-text">{msg.content}</p>
                    )}
                  </div>
                ))}
              </div>
            </>}
            <div className='prompt-container'>
                <div className='prompt-wrapper'>
                  <div className='prompt-search'>
                    <TextareaAutosize
                      className='prompt-input'
                      minRows={1}
                      maxRows={7}
                      value={input}
                      onChange={(e) => {
                        setInput(e.target.value);
                        adjustPromptSearchHeight();
                      } }
                      onKeyDown={handleKeyDown}
                      placeholder={currentPdfName ? 'Ask anything about this file' : 'Upload a PDF file first'}
                      required
                      style={{ resize: 'none' }} />
                    <div className='prompt-actions'>
                      <div className="left-actions">
                        <button id='theme-toggle-btn' className="material-symbols-outlined">light_mode</button>
                        <button id='delete-btn' className="material-symbols-outlined" onClick={onHandleDelete}>delete</button>
                      </div>
                      <div className="right-actions">
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
                            onChange={handleFileChange} />
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
                  </div>
                </div>

                <p className='bottom-info'>
                  ChatPDF can make mistakes. Please check the information provided.
                </p>
              </div>
            </div>
        )}
      </div>
    </>
  );
};

export default Window;