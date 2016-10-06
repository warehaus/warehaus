import React from 'react'
import { Route } from 'react-router'
import Root from './Root'
import LoginPage from './login/LoginPage'

const routes = () => {
    return [
        <Route key="root" path="/" component={Root} />,
        <Route key="login" path="/login" component={LoginPage} />
    ]
}

export default routes
