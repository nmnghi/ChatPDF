import {doc, updateDoc, arrayUnion, getDoc, collection, addDoc, onSnapshot, deleteDoc} from 'firebase/firestore'
import { auth, db } from '../../../firebase.config';
import { useState, useEffect, useRef } from 'react'
import {assets} from '../../assets/assets';
import { useNavigate } from 'react-router-dom';
import './Sidebar.css'
import { signOut } from 'firebase/auth';

const Sidebar = ({ updateChatHistory, updateCurrentThread, onHelpClick }) => {
  const [threads, setThreads] = useState([]);   
  const navigate = useNavigate();

  useEffect(() => {
    const fetchThreads = () => {
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        
        const unsubscribe = onSnapshot(userRef, (userDoc) => {
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setThreads(userData.chats || []);
          }
        });

        return () => unsubscribe();
      }
    };
    fetchThreads();
  }, []);

  const handleRenameThread = async (threadId) => {
    const newTitle = prompt("Enter new name for this chat:");
    if (!newTitle) return;
  
    const user = auth.currentUser;
    if (user) {
      try {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const updatedChats = userData.chats.map(chat => 
            chat.threadId === threadId ? { ...chat, threadTitle: newTitle } : chat
          );
  
          await updateDoc(userRef, { chats: updatedChats });
  
          setThreads(updatedChats);
          
          console.log('Thread renamed successfully');
        }
      } catch (error) {
        console.error('Error renaming thread:', error);
      }
    }
  };
  
  const createThread = async () => {
    const user = auth.currentUser;
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      
      const threadRef = await addDoc(collection(db, 'threads'), {
        userId: user.uid,
        contents: [],
        timestamp: Date.now()
      });

      await updateDoc(userRef, {
        chats: arrayUnion({
          threadId: threadRef.id,
          threadTitle: "New Chat", 
        })
      });
      handleThreadClick(threadRef.id);
    }
  };

  const handleThreadClick = async (threadId) => {
    updateCurrentThread(threadId);
    const threadRef = doc(db, 'threads', threadId);
    const threadDoc = await getDoc(threadRef);
    if (threadDoc.exists()) {
      const threadData = threadDoc.data();
      updateChatHistory(threadData.contents || []);
    }
  };

  const handleDeleteThread = async (threadId) => {
    try {
      const threadRef = doc(db, 'threads', threadId);
      await deleteDoc(threadRef);

      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const updatedChats = userData.chats.filter(chat => chat.threadId !== threadId);
          await updateDoc(userRef, {
            chats: updatedChats
          });
          console.log('Thread reference deleted successfully from users collection');
          
          updateChatHistory([]);
          updateCurrentThread(null);
        }
      }
    } catch (error) {
      console.error('Error deleting thread:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      console.log('User signed out');
      alert('Sign out successfully');
      navigate('/');
    } catch (err) {
      console.error('Sign out error:', err.message);
    }
  }

  return (
    <div className="sidebar">
      <div className="top">
        <div className="new-chat" onClick={createThread}>
          <img src={assets.plus_icon} alt="" />
          <p>New Chat</p>
        </div>
        <div className="recent">
          <p className="recent-title">Recent</p>
          {threads.map((thread, index) => (
              <div key={index} className="recent-entry" onClick={() => handleThreadClick(thread.threadId)}>
                <div className="thread-title">
                  <p title={thread.threadTitle}>{thread.threadTitle}</p>
                </div>
                <div onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteThread(thread.threadId);
                  }}>
                  <div className="actions">
                    <button id='menu-btn' className="material-symbols-outlined" onClick={(e) => {
                    e.stopPropagation();
                    const dropdown = e.currentTarget.nextSibling;
                    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
                    }}>
                    more_horiz
                    </button>

                    <div className="dropdown">
                      <div className="edit-btn"
                        onClick={(e) => {
                        e.stopPropagation();
                        handleRenameThread(thread.threadId);
                        }}
                      >
                        <span className="material-symbols-outlined pdf-icon">edit</span>
                        <p>Rename</p>
                      </div>
                      <div className="delete-btn" 
                        onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteThread(thread.threadId);
                        }}>
                        <span className="material-symbols-outlined pdf-icon">delete</span>
                        <p>Delete</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
      <div className="bottom">
        <div className="bottom-item" onClick={onHelpClick}>
          <button id='help-btn' className="material-symbols-outlined">help</button>
          <p>Help</p>
        </div>

        <div className="bottom-item">
          <button id='history-btn' className="material-symbols-outlined">history</button>
          <p>Activity</p>
        </div>

        <div className="bottom-item">
          <button id='settings-btn' className="material-symbols-outlined">settings</button>
          <p>Setting</p>
        </div>

        <hr className="divider" />

        <div className="bottom-item sign-out" onClick={handleSignOut}>
        <button id='logout-btn' className="material-symbols-outlined">logout</button>
          <p>Sign Out</p>
        </div>
      </div>
    </div>

    
  )
};

export default Sidebar