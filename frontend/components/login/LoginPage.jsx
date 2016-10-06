import React from 'react'
import SocialButton from 'react-social-button'
import LoginForm from './LoginForm'
import LoginFooter from './LoginFooter'

const LoginLogo = () => (
    <div className="text-center">
        <img className="logo" src="../../images/logo-wide.svg" />
    </div>
)

const LoginGoogle = () => {
    return (
        <SocialButton social="google" text="Sign in with Google" />
    )
}

const HorizontalSeparator = () => (
    <div className="horizontal-separator">
        <div className="line" />
        <div className="text">&nbsp;OR&nbsp;</div>
    </div>
)

const LoginPanel = () => (
    <div className="panel panel-default panel-login">
        <LoginLogo />
        <LoginGoogle />
        <HorizontalSeparator />
        <LoginForm />
    </div>
)

const LoginPage = () => (
    <div className="login">
        <div className="login-boundaries">
            <LoginPanel />
        </div>
        <LoginFooter />
    </div>
)

export default LoginPage
