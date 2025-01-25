import React from 'react';

const LoginPage: React.FC = () => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
            <h1>Login</h1>
            <p>Please connect your wallet or enter your email address to continue.</p>
            <div style={{ margin: '20px 0' }}>
                <button style={{ padding: '10px 20px', marginRight: '10px' }}>Connect Wallet</button>
                <input type="email" placeholder="Enter your email" style={{ padding: '10px', marginRight: '10px' }} />
                <button style={{ padding: '10px 20px' }}>Submit</button>
            </div>
        </div>
    );
};

export default LoginPage;