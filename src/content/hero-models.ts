/**
 * The models the hero can show, and the labelled points on each.
 *
 * Both assets come out of the same generator and share its conventions: one
 * merged mesh, one baked material, no named nodes to hang a label on. So every
 * anchor here was measured by raycasting the loaded geometry and reading back
 * the hit point, in the GLB's own coordinate space. Re-measure if an asset is
 * ever re-exported.
 *
 * `facing` is authored, not the surface normal. It is the direction the feature
 * reads from, which is what decides when a marker is on the near side of a
 * rotating model — the raw normal of, say, the top of an acetabular cup rim
 * points almost straight up and would hide the marker from every useful angle.
 * It doubles as the target azimuth: opening a marker turns the model until its
 * `facing` points at the camera, at azimuth `-atan2(x, z)`. Every hotspot's
 * azimuth is therefore kept inside its model's `sweep`, so opening one never
 * throws the model outside the arc it turns through on its own.
 */

export type HotspotKind = "implant" | "bone" | "tissue";

export type Hotspot = {
  id: string;
  kind: HotspotKind;
  /** Chip text at rest. Short enough not to need wrapping. */
  label: string;
  /** Card heading. May be longer than the chip. */
  title: string;
  /** One technical line under the heading. */
  meta: string;
  body: string;
  position: [number, number, number];
  facing: [number, number, number];
};

export const hotspotKindLabel: Record<HotspotKind, string> = {
  implant: "Компонент імпланта",
  bone: "Кістка",
  tissue: "Хрящова тканина",
};

export type HeroModelSpec = {
  id: string;
  /** Switcher chip text. */
  label: string;
  /** The whole scene in words, for anyone who is not going to see it. */
  description: string;
  url: string;
  /**
   * The box of model space the camera frames, in the GLB's own units.
   *
   * The top edge is what gets pinned, not the centre — see `Frame` in
   * `hero-model.tsx` — so `y` plus `halfHeight` is the highest point in shot.
   */
  frame: { y: number; halfWidth: number; halfHeight: number };
  /**
   * The arc the model sweeps through on its own, in radians of azimuth, and
   * where in that arc it opens. Drag still goes anywhere, including all the way
   * round; the sweep reels it back in afterwards rather than fighting it.
   */
  sweep: { min: number; max: number; start: number };
  hotspots: Hotspot[];
};

const rad = (deg: number) => (deg * Math.PI) / 180;

/**
 * A total hip replacement on the **right** hip (the model is a true anterior
 * view, so that is the left of the frame). The right femur is cut away so the
 * stem is visible inside the canal.
 *
 * Coordinates: x ∈ ±0.308 (lateral), y ∈ ±0.5 (iliac crest to distal femur),
 * z ∈ ±0.126 (posterior to anterior).
 *
 * The frame is deliberately portrait and deliberately not the whole asset: the
 * hip construction sits in the upper half at a size where the cup, head and
 * stem are separately readable, and the femoral shafts sweep out of the bottom,
 * where the mask fades them into the page. Fitting the entire pelvis-to-knee
 * specimen instead would put the one thing this page sells at about eighty
 * pixels tall.
 *
 * A full revolution was the obvious sweep and the wrong one. The construction
 * is on one hip and faces anterolaterally, so a complete turn spends 41% of its
 * time with no implant component visible at all — the hero showing the back of
 * a pelvis — and leaves each landmark reachable only 42-46% of the time. Swept
 * between these two bounds instead, every implant component is visible
 * throughout and each of the six landmarks is reachable 91-100% of the time.
 * The band is asymmetric because the construction is: it leans towards the side
 * the implant is on. It opens on the anterior view, so its first move is
 * towards that side.
 */
const hip: HeroModelSpec = {
  id: "hip",
  label: "Кульшовий суглоб",
  description:
    "Тривимірна модель: таз, крижова кістка та обидві стегнові кістки з ендопротезом правого кульшового суглоба — чашка в западині, керамічна головка, ніжка в каналі стегнової кістки.",
  url: "/models/implant.glb",
  frame: { y: 0.126, halfWidth: 0.33, halfHeight: 0.41 },
  sweep: { min: rad(-25), max: rad(60), start: 0 },
  hotspots: [
    {
      id: "cup",
      kind: "implant",
      label: "Чашка",
      title: "Ацетабулярна чашка",
      meta: "Трабекулярний титан · press-fit",
      body: "Запресовується в розсвердлену кульшову западину без цементу: пориста поверхня трабекулярного титану дає кістці врости в імплант протягом кількох місяців. Усередину чашки встановлюється вкладиш — поліетиленовий або керамічний, — і саме він, а не сама чашка, працює як суглобова поверхня.",
      position: [-0.193, 0.248, 0.062],
      facing: [-0.55, 0.3, 0.78],
    },
    {
      id: "head",
      kind: "implant",
      label: "Головка",
      title: "Керамічна головка",
      meta: "Кераміка · пара тертя кераміка-поліетилен",
      body: "Сідає на конус ніжки й утворює з вкладишем пару тертя. Кераміка дає найнижче тертя з доступних пар і зношує поліетилен у кілька разів повільніше за металеву головку — від цього безпосередньо залежить термін служби протеза, тому для молодших пацієнтів беруть саме її.",
      position: [-0.166, 0.198, 0.08],
      facing: [0.1, -0.15, 0.98],
    },
    {
      id: "stem",
      kind: "implant",
      label: "Ніжка",
      title: "Ніжка ендопротеза",
      meta: "Титановий сплав · безцементна фіксація",
      body: "Забивається в медулярний канал стегнової кістки — на розрізі видно, як вона впирається в губчасту кістку по всій довжині. Клиноподібний профіль дає первинну стабільність відразу на операції, пориста проксимальна частина — вростання кістки згодом.",
      // Deliberately the proximal third rather than mid-shaft. Two reasons: it is
      // the part the copy is about, and mid-shaft sat at 52% of the frame height,
      // where the detail panel's top edge lands — the marker was unclickable
      // whenever any panel was open.
      position: [-0.2116, 0.135, 0.075],
      facing: [0.25, 0, 0.97],
    },
    {
      id: "trochanter",
      kind: "bone",
      label: "Великий вертлюг",
      title: "Великий вертлюг",
      meta: "Кістка · орієнтир доступу",
      body: "Кістковий виступ на зовнішньому боці стегна, до якого кріпляться середній і малий сідничні м’язи. Хірург входить у канал через ділянку одразу над ним, тому цілість вертлюга та збережені м’язові прикріплення визначають, як швидко пацієнт стане на ногу.",
      position: [-0.281, 0.194, 0.072],
      facing: [-0.8, 0.3, 0.52],
    },
    {
      id: "acetabulum",
      kind: "bone",
      label: "Кульшова западина",
      title: "Кульшова западина",
      meta: "Кістка · ложе для чашки",
      body: "Природна суглобова ямка, утворена клубовою, сідничною та лобковою кістками. З цього боку суглоб цілий: головка стегнової кістки лежить у западині на хрящі. Під чашку западину обробляють фрезами на 1–2 мм менше за зовнішній діаметр імпланта — саме ця різниця й тримає press-fit.",
      position: [0.174, 0.252, 0.094],
      facing: [0.42, -0.15, 0.9],
    },
    {
      id: "ilium",
      kind: "bone",
      label: "Клубова кістка",
      title: "Клубова кістка",
      meta: "Кістка · опора чашки",
      body: "Найбільша з трьох кісток таза; її крило формує верхню частину западини і приймає основне навантаження від чашки. Товщина кістки над западиною вирішує, наскільки глибоко можна посадити імплант і чи потрібні додаткові гвинти для фіксації.",
      position: [0.171, 0.379, 0.006],
      facing: [-0.3, 0.35, 0.89],
    },
  ],
};

/**
 * The lumbar spine with the sacrum, instrumented from behind: pedicle screws in
 * three vertebrae each side, joined by a pair of longitudinal rods, and an
 * interbody cage in the disc space of the lowest instrumented segment. The
 * specimen is cut parasagittally on the **+x** side, so the vertebral bodies
 * are open and the screw shafts are visible inside the bone.
 *
 * Coordinates: x ∈ ±0.193 (lateral), y ∈ ±0.5 (L1 to the tip of the sacrum),
 * z ∈ ±0.198 (posterior at +z, anterior at −z).
 *
 * Where the hip has one good side, this has two bad ones. Straight from behind
 * the rods disappear into the spinous processes; straight from the front the
 * hardware is four screw tips and nothing else. The cut side is the one that
 * shows everything at once — rod, screw heads, threads inside the bodies, the
 * cage — so the sweep is a hundred degrees centred on it. It opens obliquely
 * rather than at the true lateral, because a column photographed dead side-on
 * reads as flat.
 *
 * The frame takes nearly the whole specimen: unlike the hip, where the femurs
 * are a tail that can run off the bottom, every level here is instrumented or
 * carries a landmark. The sacrum still runs into the bottom fade, which is why
 * its marker sits on the ala rather than lower down.
 */
const spine: HeroModelSpec = {
  id: "spine",
  label: "Хребет",
  description:
    "Тривимірна модель: поперековий відділ хребта з крижовою кісткою та транспедикулярною фіксацією — гвинти в тілах хребців, два поздовжні стрижні й міжтіловий кейдж на місці видаленого диска.",
  url: "/models/spine.glb",
  frame: { y: 0.02, halfWidth: 0.28, halfHeight: 0.52 },
  sweep: { min: rad(220), max: rad(320), start: rad(245) },
  hotspots: [
    {
      id: "screw",
      kind: "implant",
      label: "Гвинт",
      title: "Транспедикулярний гвинт",
      meta: "Титановий сплав · поліаксіальна головка",
      body: "Проходить через ніжку дуги хребця в його тіло — найміцніший кістковий коридор, який дає гвинту опору одразу в задній, середній і передній колонах хребця. Поліаксіальна головка обертається відносно різьби, тому гвинти можна посадити під різними кутами й усе одно вивести їх на один стрижень.",
      position: [0.132, 0.1862, -0.0439],
      facing: [0.98, 0.1, 0.1],
    },
    {
      id: "rod",
      kind: "implant",
      label: "Стрижень",
      title: "Поздовжній стрижень",
      meta: "Титановий сплав · контурується на операції",
      body: "З’єднує головки гвинтів в одну жорстку рамку. Стрижень згинають під природний лордоз пацієнта просто на операції — саме він задає, у якому положенні зростуться хребці. Пара стрижнів обабіч остистих відростків знімає навантаження з ушкодженого сегмента, поки формується кістковий блок.",
      position: [0.1259, 0.049, 0.1267],
      facing: [0.85, 0.05, 0.52],
    },
    {
      id: "cage",
      kind: "implant",
      label: "Кейдж",
      title: "Міжтіловий кейдж",
      meta: "Міжтілове зрощення · зубчасті опорні поверхні",
      body: "Стає на місце видаленого диска й відновлює висоту проміжку, звільняючи затиснуті нервові корінці. Порожнину кейджа заповнюють кістковою стружкою: крізь неї два сусідні хребці зростаються в один блок, а зубчасті поверхні не дають імпланту зміститися, поки це відбувається.",
      position: [0.1037, -0.1733, -0.1339],
      facing: [0.93, 0, -0.35],
    },
    {
      id: "body",
      kind: "bone",
      label: "Тіло хребця",
      title: "Тіло хребця",
      meta: "Кістка · опора для гвинта",
      body: "На розрізі видно губчасту кістку всередині й тонкий щільний кортикальний шар зовні. Тіло приймає майже все осьове навантаження хребта і тримає передню частину гвинта, тому його щільність — головне, від чого залежить, чи витримає фіксація.",
      position: [0.1013, 0.06, -0.1174],
      facing: [0.95, 0, -0.28],
    },
    {
      id: "disc",
      kind: "tissue",
      label: "Диск",
      title: "Міжхребцевий диск",
      meta: "Фіброзне кільце та драглисте ядро",
      body: "Хрящовий амортизатор між тілами хребців: пружне ядро всередині, шари фіброзного кільця зовні. Здорові рівні на моделі залишені недоторканими — фіксують тільки той сегмент, де диск зруйновано, бо кожен додатково знерухомлений рівень перекладає навантаження на сусідні.",
      position: [0.1084, 0.2938, -0.1024],
      facing: [0.96, -0.05, -0.22],
    },
    {
      id: "sacrum",
      kind: "bone",
      label: "Крижова кістка",
      title: "Крижова кістка",
      meta: "Кістка · основа поперекового відділу",
      body: "П’ять зрощених хребців, які передають вагу тіла з поперека на таз. Перехід від рухомого L5 до нерухомої крижі — найнавантаженіший рівень хребта: тут найчастіше руйнується диск, і від стану цієї основи залежить, наскільки низько доводиться вести фіксацію.",
      // On the ala, and no lower. The sacrum runs down to the bottom of the
      // frame, where the mask has already faded it out — a marker down there
      // would be labelling a ghost.
      position: [0.1904, -0.279, 0.0424],
      facing: [0.97, 0.15, 0.05],
    },
  ],
};

/** First entry is what the hero opens on, and the only one preloaded. */
export const heroModels: HeroModelSpec[] = [hip, spine];
