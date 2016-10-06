import React from 'react'

export default class LoginForm extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
        }
    }

    onSubmit(e) {
        e.preventDefault()
    }

    render() {
        return (
            <form role="form" name="loginForm" onSubmit={this.onSubmit}>
            </form>
        )
    }
}
