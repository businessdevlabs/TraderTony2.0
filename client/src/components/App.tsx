import React from 'react';
import { CsvUploader } from './transformOHLC';

const App: React.FC = () => {
  return (
    <div>
      <h1>TraderTony 2.0</h1>
      <p>This is the main application component csv.</p>
      <CsvUploader />
    </div>
  );
};

export default App;
