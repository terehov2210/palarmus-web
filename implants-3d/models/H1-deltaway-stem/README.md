# H1 — DeltaWay™ femoral stem, 4# STD 12/14

iKey Medical, бесцементная бедренная ножка. Источники: `source/3Д скелет/Кульшовий суглоб/Delta (англійською мовою).pdf`
(размерная таблица), рендер `source/Ендопротезування/…/DeltaWay™ ніжка.png`.

| Параметр | Значение |
| --- | --- |
| Длина A / офсет B / шейка C / дистальный Ø D | 137 / 38 / 32.5 / 8 мм |
| Угол CCD | 130° |
| Конус | 12/14 |
| Покрытие | пористое Ti-напыление 0.5 мм, проксимальная часть |
| Origin | центр головки; единицы — метры, +Y вверх (glTF) |

## Файлы

| Файл | Треуг. | Вес | Для |
| --- | --- | --- | --- |
| `dist/deltaway_stem_lod0.glb` | 30 230 | 431 КБ | desktop |
| `dist/deltaway_stem_lod1.glb` | 9 156 | 143 КБ | mobile |

Расширения: `EXT_meshopt_compression`, `EXT_texture_webp`, `KHR_mesh_quantization`,
`KHR_texture_transform`. В three.js нужен `MeshoptDecoder` (на сайте уже подключён).

Материалы из `materials/`: `ti_polished` (плечо, шейка, конус), `ti_satin` (дистальная часть),
`ti_plasma_spray` (напыление).

## Сборка
`./build.sh` (или `./build.sh --no-render`). Требуется Python с numpy / scikit-image / Pillow,
Blender 5.1, Node и `E:/Palarmus/_3d-work/node_modules`.

| Файл | Что делает |
| --- | --- |
| `stem_params.py` | все размеры, плоскости покрытия, профиль токарной части |
| `build_sdf.py` | SDF → эталонные меши `build/*_hi.ply` + поля `build/fields.npz` |
| `build_blender.py` | ремеш, удаление скрытого, срез кромки, lathe, UV, нормали, экспорт LOD |
| `renders/` | `render_*` — Cycles; `web_*` — скриншоты из вьюера (крупные планы, сетка) |
