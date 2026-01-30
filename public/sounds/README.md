# Lucky Draw Sounds

App đang dùng sound từ **Mixkit** (royalty-free, không cần ghi nguồn) qua CDN.

## Đang dùng trong code

- **tick** – tiếng ngắn khi vòng quay đổi số (spin). Mixkit SFX 2568.
- **win** – tiếng ăn mừng khi ra kết quả trúng. Mixkit SFX 2000.
- **complete** – tiếng khi kết thúc một round / chuyển round. Mixkit SFX 2019.

## Nguồn tìm sound thay thế

- **Mixkit – Slot machine / Win / Notification**  
  https://mixkit.co/free-sound-effects/slot-machine/  
  https://mixkit.co/free-sound-effects/win/  
  https://mixkit.co/free-sound-effects/notification/

- **Pixabay – Lottery / Win / Celebration**  
  https://pixabay.com/sound-effects/search/lottery/  
  https://pixabay.com/sound-effects/search/win/

- **Freesound**  
  https://freesound.org/ (kiểm tra license trước khi dùng).

Nếu muốn dùng file local: đặt `tick.m4a`, `win.m4a`, `complete.m4a` (hoặc `.mp3`/`.wav`) vào thư mục này và đổi trong code sang `/sounds/tick.m4a`, v.v.
