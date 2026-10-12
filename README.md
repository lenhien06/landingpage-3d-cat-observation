# Quan sát chú mèo 3D – Tìm ý viết văn

Trang quan sát toàn màn hình cho học sinh lớp 4, sử dụng mô hình **Bicolor Cat** dựng theo mèo thật với texture lông cam–trắng, mắt, mũi và ria. Học sinh xoay, phóng to, chọn bộ phận, ghi ý và tạo dàn ý. Bài làm được lưu trong trình duyệt, không cần tài khoản hay máy chủ dữ liệu.

## Chạy trên Windows PowerShell

Yêu cầu Node.js 20.19+ hoặc 22.12+.

```powershell
cd D:\Project\landingpage-3d-cat-observation
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

- Khi mô hình tải xong, bảng ghi ý hiện ở bên phải trên máy tính hoặc phía dưới trên điện thoại. Nút **Ghi ý / Ẩn ghi ý** dùng để mở hoặc đóng bảng.
- Kéo mèo để xoay 360°. Cuộn chuột hoặc dùng nút `+` và `−` để phóng to, thu nhỏ. Nút **Về góc nhìn ban đầu** đưa camera về vị trí ban đầu.
- Bấm trực tiếp vào mắt, tai, chân, đuôi trên bề mặt mèo hoặc các nút trong bảng để xem câu hỏi tương ứng. Bấm thân mèo để quan sát toàn thể.
- Ghi từng ý, bấm **Lưu ý**, rồi dùng **Tạo dàn ý**. Có thể sửa, xóa ý và chỉnh nội dung dàn ý.

Ý đã ghi, bản nháp và dàn ý được lưu trong `localStorage` của cùng trình duyệt. Nút **Làm bài mới** yêu cầu xác nhận trước khi xóa.

## Mô hình và hiển thị

- `public/models/bicolor-cat.glb`: mô hình ngoài khoảng 2,3 MB với texture và khung xương. Tệp được phục vụ từ dự án, không phụ thuộc CDN khi chạy.
- `src/config/model.ts`: đường dẫn mô hình, hướng, kích thước và thông tin ghi công.
- `src/components/ModelLoader.tsx`: tải GLB, bảo toàn khung xương/texture và xử lý chọn bộ phận.
- `src/utils/catModel.ts`: chuẩn hóa vị trí trên mặt đất, chất liệu lông mờ, vùng bấm và điểm camera. Điểm bấm gắn vào bề mặt có skinning để đi theo chuyển động đầu, chân và đuôi.
- `src/config/hotspots.json`: tọa độ mắt, tai, bàn chân và đuôi trong hệ tọa độ của mô hình.
- `src/components/CatViewer.tsx`: ánh nắng cửa sổ, bóng mềm, camera và điều khiển xoay/zoom; tự căn theo bảng ghi ý.
- `src/components/RoomEnvironment.tsx`: góc phòng với sàn gỗ, thảm dệt, tường vữa, cửa sổ nhìn ra vườn và rèm vải. Tường chỉ hiện từ phía trong để camera vẫn xoay được 360°.
- `src/components/RoomProps.tsx`: ghế vải, bàn gỗ, sách, cốc, cây xanh, giỏ mây, bát nước/thức ăn và cuộn len. Vật trang trí không chặn thao tác chọn mèo.
- `src/utils/roomTextures.ts`, `public/textures/`: chất liệu PBR sàn gỗ/tường và chất liệu dệt dùng chung; tất cả được phục vụ từ dự án, không tải CDN lúc chạy.
- `src/App.tsx`, `src/data/questions.ts`, `src/styles.css`: bảng ghi ý, nội dung tiếng Việt và giao diện.

Mèo phát chuyển động đứng yên (idle) có sẵn trong GLB: đầu quay nhẹ, cơ thể và đuôi chuyển động tự nhiên, các chân vẫn đặt trên mặt đất. Chuyển động tạm dừng khi chọn một bộ phận để quan sát rõ. Khi trình duyệt bật `prefers-reduced-motion`, mèo giữ tư thế tĩnh. Scene dùng cơ chế vẽ theo yêu cầu; khi animation dừng, chỉ vẽ lại khi tải, tương tác hoặc camera chuyển góc.

Mã `ProceduralCat.tsx` và mô hình trắng `cat.glb` được giữ làm tài nguyên cũ; trang hiện tại không tải chúng.

## Nguồn và giấy phép

**Bicolor Cat** của [kenchoo](https://sketchfab.com/3d-models/bicolor-cat-e623a618ca344a8393d7ba4d63ec23cf), phát triển từ **3d modelling my cat: Fripouille** của [guillaume bolis](https://skfb.ly/6TKqH), được sử dụng theo [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

Bản tải từ [kho vr-cats](https://github.com/code4fukui/vr-cats). GLB gốc được giữ nguyên; ứng dụng điều chỉnh kích thước, vị trí, độ nhám chất liệu và ánh sáng. Thông tin ghi công hiện trên trang và trong `public/models/ATTRIBUTION.md`.

Chất liệu **Wood Floor** và **White Plaster 02** từ [Poly Haven](https://polyhaven.com), theo CC0. Nguồn và các bản texture dùng trong cảnh được ghi tại `public/textures/ATTRIBUTION.md`. Vải, vân gỗ đồ nội thất, thảm và cảnh vườn mờ được tạo bằng mã nguồn của ứng dụng.
