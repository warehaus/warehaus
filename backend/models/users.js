import { v4 as uuid } from 'uuid'
import { queryDb, returnOne, returnOneOf } from './db/connection'
import Event from './events'

export default class User {
    static initModel() {
        return Promise.resolve()
            .then(() => queryDb(`CREATE CONSTRAINT ON (user:User) ASSERT user.uid IS UNIQUE`))
            .then(() => queryDb(`CREATE CONSTRAINT ON (user:User) ASSERT user.username IS UNIQUE`))
            .then(() => queryDb(`CREATE INDEX ON :User(created)`))
            .then(() => queryDb(`CREATE CONSTRAINT ON (cred:Credentials) ASSERT cred.id IS UNIQUE`))
    }

    static create({ username, role, email, display_name }) {
        const props = { uid: uuid(), username, role, email, display_name }
        return queryDb(`CREATE (user:User)
                        SET user = { props }, user.created = timestamp()
                        RETURN user`, { props })
            .then(returnOneOf(User))
            .then(user => Event.create({ title: `**${user.props.display_name}** joined warehaus` }).then(() => user))
    }

    static find(uid) {
        return queryDb(`MATCH (user:User { uid: {uid} }) RETURN user`, { uid }).then(returnOneOf(User))
    }

    static findByUsername(username) {
        return queryDb(`MATCH (user:User { username: {username} })`, { username }).then(returnOneOf(User))
    }

    static findByCredentials({ backend, id }) {
        return queryDb(`MATCH (user:User)-[:IdentifiedBy { backend: {backend} }]->(cred:Credentials { id: {id} })
                        RETURN user`, { backend, id }).then(returnOneOf(User))
    }

    static count() {
        return queryDb(`MATCH (:User) RETURN count(*) AS count`).then(returnOne)
    }

    static isUsernameTaken(username) {
        if (!username) {
            return Promise.resolve(true)
        }
        return User.findByUsername(username)
            .then(user => Boolean(user))
    }

    constructor(node) {
        this.node = node
    }

    get props() {
        return this.node.properties
    }

    getCredentials({ backend, single }) {
        return queryDb(`MATCH (user:User { uid: {uid} })-[:IdentifiedBy { backend: {backend} }]->(cred:Credentials)
                        RETURN cred`, { uid: this.uid, backend }).then(single ? returnOne : x => x)
    }

    addCredentials({ backend, props }) {
        return this.setCredentials({ backend, props, replace: false })
    }

    setCredentials({ backend, props, replace }) {
        if (!props || !props.id) {
            return Promise.reject(`Credentials must contain an 'id' for ${backend} backend`)
        }
        const remove_query = replace ? `MATCH (user)-[:IdentifiedBy { backend: {backend} }]->(old:Credentials {props})
                                        DETACH DELETE old` : ''
        return queryDb(`MATCH (user:User { uid: {uid} })
                        ${remove_query}
                        CREATE UNIQUE (user)-[:IdentifiedBy { backend: {backend} }]->(cred:Credentials {props})
                        ON CREATE SET cred.created = timestamp()
                        RETURN cred`, { uid: this.uid, backend, props })
            .then(returnOne)
    }

    removeCredentials({ backend, id }) {
        return queryDb(`MATCH (user:User { uid: {uid} })-[:IdentifiedBy { backend: {backend} }]->(cred:Credentials, { id: {id} })
                        DETACH DELETE cred`, { uid: this.uid, backend, id })
    }
}
