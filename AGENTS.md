# 🤖 AI Agent Engineering Standards & Governance

## 🎯 Architecture Rules

1. **Separation of Concerns (SoC)** :
   - ห้ามรวม Business Logic หรือ SQL Query ไว้ใน View หรือ Component โดยเด็ดขาด ให้เรียกใช้งานผ่าน `services/` เสมอ
   - แบ่งเลเยอร์ชัดเจน : database -> services -> components -> main view

2. **Design Standard** :
   - สไตล์โมเดิร์น คลีน สบายตา ใช้ Icon มาตรฐาน (`lucide-react`) หลีกเลี่ยง Emoji ปนเปื้อนในระบบ
   - ธีม Minimalist Light Studio แยกสไตล์และโทนสีอย่างเป็นระบบ

3. **Idempotent Operations** :
   - ทุกฟังก์ชันตัดสต็อก ชำระเงิน หรือส่งคำขอ ต้องป้องกันการกดย้ำ (Debounce & Disable Button) ป้องกัน Race Condition

4. **Test-Driven Reliability** :
   - ทุก Feature สำคัญและ Service ต้องมี Automated Test ครอบคลุมเสมอ

5. **Formatting Conventions** :
   - ทุกตำแหน่งที่มีเครื่องหมายโคลอน ให้เว้นวรรคทั้งหน้าและหลัง (` : `)
   - ลดและหลีกเลี่ยงการใช้เครื่องหมายคำพูดคู่ ให้ใช้คำกระชับหรือ backticks แทน
