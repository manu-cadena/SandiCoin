import React, { useState } from 'react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

const AuthForm: React.FC = () => {
  const [isLoginMode, setIsLoginMode] = useState(true);

  if (isLoginMode) {
    return <LoginForm onSwitchToRegister={() => setIsLoginMode(false)} />;
  } else {
    return <RegisterForm onSwitchToLogin={() => setIsLoginMode(true)} />;
  }
};

export default AuthForm;
