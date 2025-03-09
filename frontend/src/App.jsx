import SignIn from './components/SignIn_SignUp/SignIn'
import SignUp from './components/SignIn_SignUp/SignUp'
import Home from "./Home"
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/home" element={<Home />} />
      </Routes>
    </Router>
  )
}

export default App