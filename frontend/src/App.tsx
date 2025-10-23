import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Layout/Navbar';
import { Home } from './pages/Home';
import { History } from './pages/History';
import { ApiDocs } from './pages/ApiDocs';
import { About } from './pages/About';
import { NotFound } from './pages/NotFound';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/history" element={<History />} />
          <Route path="/docs" element={<ApiDocs />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
