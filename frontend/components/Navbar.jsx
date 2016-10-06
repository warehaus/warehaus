import React from 'react'
import { Navbar, Nav } from 'react-bootstrap'

export const HausNavbar = () => (
    <Navbar bsStyle="warehaus">
        <Navbar.Header>
            <Navbar.Brand>
                <a href="/">
                    <img className="square" src="../images/logo-wide.svg" />
                </a>
            </Navbar.Brand>
            <Navbar.Toggle />
        </Navbar.Header>
        <Navbar.Collapse>
            <Nav>
            </Nav>
        </Navbar.Collapse>
    </Navbar>
)
