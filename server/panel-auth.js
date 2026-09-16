import crypto from 'node:crypto';
export function hashPassword(password){const salt=crypto.randomBytes(16).toString('hex');return {salt,hash:crypto.scryptSync(password,salt,64).toString('hex')};}
export function verifyPassword(password,record){if(typeof password!=='string'||password.length>1024||!record)return false;const actual=crypto.scryptSync(password,record.salt,64);const expected=Buffer.from(record.hash,'hex');return actual.length===expected.length&&crypto.timingSafeEqual(actual,expected);}
