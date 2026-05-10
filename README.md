# CubeAL Frontend

Frontend la bo trang HTML/CSS/JS tinh, nhung can duoc serve qua HTTP de CORS va duong dan API hoat dong dung.

## Chay local

1. Chay backend o `http://localhost:5000`.
2. Tu thu muc `Frontend`, serve file tinh tren port `5500`:

```powershell
cd Frontend
python -m http.server 5500
```

3. Mo `http://localhost:5500/index.html`.

Mac dinh frontend goi API tai `http://localhost:5000/api`. Neu can doi endpoint, dat bien tren trang truoc khi load cac file JS:

```html
<script>
    window.CUBEAL_API_BASE_URL = "http://localhost:5000/api";
</script>
```

## Luong local

- Dang nhap bang admin local sau khi chay seed backend.
- Vao `admin.html` de xem tong quan, them/sua/xoa cong thuc, xem user dang hoat dong va cap nhat thong tin co ban cua user.
- Vao `cfop.html` de xem catalog CFOP F2L/OLL/PLL da seed tu asset.
- Vao `beginner.html` de xem noi dung Beginner khi co du lieu active trong backend.
- Vao `timer.html` de luu solve vao tai khoan dang dang nhap.
