/**
 * Password hashing utilities using Node.js crypto (Web Crypto API).
 * No external dependencies — works in all Node.js 18+ environments.
 */

const SCRYPT_KEYLEN = 64
const SCRYPT_COST = 16384
const SCRYPT_BLOCK_SIZE = 8
const SCRYPT_PARALLELIZATION = 1

/**
 * Hash a password using scrypt.
 * Returns a string in the format: `scrypt$cost$blockSize$parallel$salt$hash`
 */
export async function hashPassword(password: string): Promise<string> {
  const { scrypt, randomBytes } = await import('node:crypto')

  const salt = randomBytes(16).toString('hex')
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      SCRYPT_KEYLEN,
      { N: SCRYPT_COST, r: SCRYPT_BLOCK_SIZE, p: SCRYPT_PARALLELIZATION },
      (err, derivedKey) => {
        if (err) reject(err)
        else resolve(`scrypt$${salt}$${derivedKey.toString('hex')}`)
      }
    )
  })
}

/**
 * Verify a password against a stored hash.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash.startsWith('scrypt$')) return false

  const { scrypt } = await import('node:crypto')

  const parts = storedHash.split('$')
  const salt = parts[1]
  const expectedHash = parts[2]

  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      SCRYPT_KEYLEN,
      { N: SCRYPT_COST, r: SCRYPT_BLOCK_SIZE, p: SCRYPT_PARALLELIZATION },
      (err, derivedKey) => {
        if (err) reject(err)
        else resolve(derivedKey.toString('hex') === expectedHash)
      }
    )
  })
}
