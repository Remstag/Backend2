# Project-Hop-ho-online-


## Seed dữ liệu từ file Excel
Dự án đã được chèn sẵn bộ seed sinh từ file `Cung_Cap_Thong_tin (2) (1).xlsx`.

### Chạy nhanh
1. Cập nhật `MONGO_URI` trong `.env`
2. Cài package nếu cần:
   ```bash
   npm install
   ```
3. Kiểm tra seed khớp schema:
   ```bash
   npm run validate:seed:xlsx
   ```
4. Nạp dữ liệu:
   ```bash
   npm run seed:xlsx
   ```
5. Chạy server:
   ```bash
   npm start
   ```

### Tài khoản mặc định
- `admin / 123456`
- `editor / 123456`
- `member / 123456`

### Ghi chú
- Tổng person: 2047 (`1044` từ Excel + `1003` placeholder tự sinh).
- Tổng relationship: 2927.
- Placeholder được tạo cho các quan hệ trong Excel không thể đối chiếu chắc chắn tới một dòng người cụ thể, để seed chạy trọn bộ không bị đứt quan hệ.
- Báo cáo nằm tại `src/db/seedData/xlsx_seed_report.json`.
