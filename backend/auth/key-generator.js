export function generateKey(len = 48) {
    let result = ''
    const CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!"#$%&\'()*+,-./:<=>?@[\\]^_`{|}~ '
    for (let i = 0; i < len; ++i) {
        result += CHARS.charAt(Math.floor(Math.random() * CHARS.length))
    }
    return result
}
