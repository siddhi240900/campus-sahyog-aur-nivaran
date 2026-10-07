import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Enables React's automatic JSX runtime. Without this, JSX compiles to
// React.createElement and the browser throws "React is not defined".
export default defineConfig({ plugins: [react()] });
