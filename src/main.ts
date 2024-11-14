import hljs from 'highlight.js';
import json from 'highlight.js/lib/languages/json';

import 'highlight.js/styles/base16/material-palenight.min.css';
import './index.css';

hljs.registerLanguage('json', json);

const copyToClipboard = (text: string) => {
  // Create textarea element
  const textArea = document.createElement('textarea');
  textArea.style.position = 'fixed';
  textArea.style.left = '-9999px';
  textArea.value = text;
  
  // Add to DOM
  document.body.appendChild(textArea);
  
  // Select and copy
  textArea.select();
  document.execCommand('copy');
  
  // Clean up
  document.body.removeChild(textArea);
};

window.onmessage = async (event) => {
  if (event.data.pluginMessage.type === 'copy') {
    const text = event.data.pluginMessage.text;
    document.getElementById('variables')!.textContent = text.trim();
    hljs.highlightAll();
  }
}

document.getElementById('copy')!.onclick = () => {
  const text = document.getElementById('variables')!.textContent;
  copyToClipboard(text!);
  const button = document.getElementById('copy');
  button!.textContent = '✅ Copied!';
  setTimeout(() => {
    button!.textContent = '📋 Copy Variables';
  }, 2000);
}

document.getElementById('refresh')!.onclick = () => {
  document.getElementById('variables')!.textContent = '';
  document.getElementById('variables')!.removeAttribute('data-highlighted');
  parent.postMessage({ pluginMessage: { type: 'copy-variables' } }, '*');
}

window.onload = () => {
  parent.postMessage({ pluginMessage: { type: 'copy-variables' } }, '*');
}