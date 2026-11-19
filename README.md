# 앵커늘봄 강사서류 작성

호서대학교 앵커늘봄총괄센터 · 강사 계약 서류(주강사·보조강사) 작성 화면

- 강사 정보를 한 번 입력하면 0~12번 한글 서류를 학교별로 채워 ZIP으로 저장합니다.
- 강사가 낸 서류(ZIP·HWP·HWPX·PDF·JPG)를 끌어다 놓으면 빈칸을 미리 채웁니다.
- 모든 처리는 **사용자 브라우저 안에서만** 합니다. 입력한 개인정보는 서버로 보내지 않고, 그 PC의 브라우저(IndexedDB)에만 저장됩니다.

## 파일
| 파일 | 내용 |
|---|---|
| index.html | 화면 |
| hwpcore.js | 한글(HWP 5.0) 읽기·쓰기 |
| forms.js | 양식별 채움 규칙 |
| importer.js | 낸 서류 읽어서 빈칸 채우기 |
| templates.js | 빈 양식 12종 (개인정보 없음) |
| cfb.min.js, pako.min.js, jszip.min.js | 라이브러리 |
| favicon.png, brand.png, anchor.png, PretendardVariable.woff2 | 로고·글꼴 |

## 주의
- 강사 개인정보가 든 파일(운영 목록 사본, 강사가 낸 서류, 생성한 ZIP)은 이 저장소에 올리지 마세요. GitHub Pages 사이트는 누구나 볼 수 있습니다.
- 고칠 때마다 index.html 의 `APP_VERSION` 날짜를 바꿔 주세요.
