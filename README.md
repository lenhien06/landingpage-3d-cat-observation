# Quan sát chú mèo 3D – Tìm ý viết văn

Trang quan sát toàn màn hình cho học sinh lớp 4. Mèo vàng được dựng từ các hình khối Three.js theo đoạn HTML mẫu; học sinh xoay, phóng to, chọn bộ phận, ghi ý và tạo dàn ý. Ứng dụng chạy trong trình duyệt, không cần tài khoản hay máy chủ dữ liệu.

## Chạy trên Windows PowerShell

Yêu cầu Node.js 20.19+ hoặc 22.12+.

```powershell
cd E:\Langdingpage
npm install
npm run dev
```

Mở địa chỉ Vite in trong terminal, thường là `http://localhost:5173/`. Kiểm tra mã nguồn và bản xuất:

```powershell
npm run typecheck
npm run build
npm run preview
```

## Sử dụng

- Sau khi mèo chạy vào màn hình, bảng ghi ý hiện ở bên phải trên máy tính hoặc ở phía dưới trên điện thoại. Nút **Ghi ý / Ẩn ghi ý** dùng để mở hoặc đóng bảng.
- Kéo mèo để xoay 360°. Cuộn chuột hoặc dùng nút `+` và `−` để phóng to, thu nhỏ. Nút **Về góc nhìn ban đầu** đưa camera về vị trí ban đầu.
- Bấm vào mắt, tai, chân, đuôi trên mèo hoặc các nút trong bảng để xem câu hỏi tương ứng. Bấm vào thân mèo để quay về nhóm quan sát toàn thể.
- Ghi từng ý, bấm **Lưu ý**, rồi dùng **Tạo dàn ý** ở góc trên. Có thể sửa, xóa ý và chỉnh nội dung dàn ý.

Ý đã ghi, bản nháp và dàn ý được lưu trong `localStorage` của cùng trình duyệt. Nút **Làm bài mới** yêu cầu xác nhận trước khi xóa.

## Chỉnh mô hình và nội dung

- `src/components/ProceduralCat.tsx`: hình học, màu lông, mắt, tai, chân, đuôi và chuyển động chạy vào/đứng yên. Mã này dùng gói `three` đã cài trong dự án, không tải thư viện từ CDN.
- `src/components/CatViewer.tsx`: scene toàn màn hình, ánh sáng, mặt đất, camera, xoay, zoom và góc nhìn cho từng bộ phận.
- `src/App.tsx`: bảng ghi ý, lưu bài và hộp dàn ý.
- `src/data/questions.ts`: nhóm quan sát và câu hỏi tiếng Việt.
- `src/styles.css`: bố cục toàn màn hình và bảng nổi.

File `public/models/cat.glb`, `src/components/ModelLoader.tsx` và cấu hình hotspot là tài nguyên của phiên bản mèo trắng trước đó; trang hiện tại không tải chúng. Chuyển động chân và đuôi hiện áp dụng trên các bộ phận hình khối riêng của mèo mới.
