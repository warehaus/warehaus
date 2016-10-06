import React from 'react'
import moment from 'moment'
import pkg from '../../../package.json'

const LoginFooterCopyright = () => (
    <span>
        &copy;
        2015-{moment().year()}
        &nbsp;
        <a href={pkg.github + '/graphs/contributors'} target="_wh_gh_contributors">
            Warehaus contributors
        </a>
    </span>
)

const LoginFooterLinks = () => (
    <span>
        <a href={pkg.homepage} target="_wh_homepage">
            Homepage
        </a>
        &nbsp;|&nbsp;
        <a href={pkg.docs} target="_wh_docs">
            Docs
        </a>
        &nbsp;|&nbsp;
        <a href={pkg.github} target="_wh_gh_repo">
            GitHub
        </a>
    </span>
)

const LoginFooter = () => (
    <div>
        <div className="visible-xs">
            <div>
                <LoginFooterCopyright />
            </div>
            <div>
                <LoginFooterLinks />
            </div>
        </div>
        <div className="hidden-xs">
            <LoginFooterCopyright />
            &nbsp;|&nbsp;
            <LoginFooterLinks />
        </div>
    </div>
)

export default LoginFooter
