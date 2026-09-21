import bcrypt from 'bcryptjs';

const pin = process.argv[2] || '123456';

if (!/^\d{6}$/.test(pin)) {
  console.error('❌ Lỗi: Mã PIN phải gồm đúng 6 chữ số (Ví dụ: 123456)');
  process.exit(1);
}

const saltRounds = 10;
const hash = bcrypt.hashSync(pin, saltRounds);

console.log('--------------------------------------------------');
console.log(`🍪 Băm mã PIN thành công cho: "${pin}"`);
console.log('👉 Hãy copy dòng sau vào file .env trong thư mục server:');
console.log(`ADMIN_PIN_HASH=${hash}`);
console.log('--------------------------------------------------');
