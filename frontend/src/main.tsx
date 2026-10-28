import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@pixel-kit/react/styles.css';
import './styles.css';
import App from './App';
import { countPageView } from './api';

countPageView();
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
