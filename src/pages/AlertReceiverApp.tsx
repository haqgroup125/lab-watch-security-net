
import React from 'react';
import AlertReceiver from '@/components/AlertReceiver';
import Footer from '@/components/Footer';

const AlertReceiverApp = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1">
        <AlertReceiver />
      </div>
      <Footer />
    </div>
  );
};

export default AlertReceiverApp;
