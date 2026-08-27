/**
 * Pairing-modal copy, carried by the SDK.
 *
 * The modal is rendered by this package, so its strings have to ship with it:
 * an integrator cannot translate a component they never write, and asking every
 * one of them to re-supply the same fifteen strings is how a sign-in screen
 * ends up half-English in production.
 *
 * No i18n runtime. A frozen record and one `{time}` substitution is the whole
 * requirement, and a dependency here would be inherited by every host app.
 *
 * Locales match the set ZOREAL's own pairing page serves, so the phone and the
 * browser say the same thing in the same language. `strings()` resolves BCP 47
 * down to that set; anything unknown falls back to English rather than
 * rendering a key.
 */

export interface PairingStrings {
  /** Dialog title while the code is still unscanned. */
  title: string;
  /** Dialog title once the request is waiting in the app. */
  titleApprove: string;
  bodyScan: string;
  bodyApprove: string;
  bodyEnrolling: string;
  waiting: string;
  waitingApproval: string;
  /** Carries `{time}`, substituted with mm:ss. */
  expiresIn: string;
  secured: string;
  noIdTitle: string;
  noIdBody: string;
  cancel: string;
  close: string;
  qrAlt: string;
}

const en: PairingStrings = {
  title: 'Scan to sign in',
  titleApprove: 'Approve on your phone',
  bodyScan: 'Scan with your phone camera or the ZOREAL ID app.',
  bodyApprove: 'Approve the login in your ZOREAL ID app.',
  bodyEnrolling: 'Finish setting up ZOREAL ID on your phone, then approve the login.',
  waiting: 'Waiting for scan',
  waitingApproval: 'Waiting for approval',
  expiresIn: 'Expires in {time}',
  secured: 'Proof-of-Human verification by ZOREAL',
  noIdTitle: 'No ZOREAL ID yet?',
  noIdBody: 'Scan the same code to download the app and create one for free. It only takes a minute.',
  cancel: 'Cancel',
  close: 'Close',
  qrAlt: 'QR code to sign in with ZOREAL',
};

const TRANSLATIONS: Record<string, PairingStrings> = {
  en,
  sv: {
    title: 'Skanna för att logga in',
    titleApprove: 'Godkänn på telefonen',
    bodyScan: 'Skanna med telefonens kamera eller ZOREAL ID-appen.',
    bodyApprove: 'Godkänn inloggningen i ZOREAL ID-appen.',
    bodyEnrolling: 'Slutför konfigurationen av ZOREAL ID på telefonen och godkänn sedan inloggningen.',
    waiting: 'Väntar på skanning',
    waitingApproval: 'Väntar på godkännande',
    expiresIn: 'Upphör om {time}',
    secured: 'Proof-of-Human-verifiering av ZOREAL',
    noIdTitle: 'Har du inget ZOREAL ID?',
    noIdBody: 'Skanna samma kod för att ladda ner appen och skapa ett gratis. Det tar bara en minut.',
    cancel: 'Avbryt',
    close: 'Stäng',
    qrAlt: 'QR-kod för att logga in med ZOREAL',
  },
  es: {
    title: 'Escanea para iniciar sesión',
    titleApprove: 'Apruébalo en tu teléfono',
    bodyScan: 'Escanea con la cámara de tu teléfono o con la app ZOREAL ID.',
    bodyApprove: 'Aprueba el inicio de sesión en tu app ZOREAL ID.',
    bodyEnrolling: 'Termina de configurar ZOREAL ID en tu teléfono y luego aprueba el inicio de sesión.',
    waiting: 'Esperando el escaneo',
    waitingApproval: 'Esperando aprobación',
    expiresIn: 'Caduca en {time}',
    secured: 'Verificación Proof-of-Human de ZOREAL',
    noIdTitle: '¿Aún no tienes ZOREAL ID?',
    noIdBody: 'Escanea el mismo código para descargar la app y crear una gratis. Solo toma un minuto.',
    cancel: 'Cancelar',
    close: 'Cerrar',
    qrAlt: 'Código QR para iniciar sesión con ZOREAL',
  },
  pt: {
    title: 'Digitalize para entrar',
    titleApprove: 'Aprove no seu telefone',
    bodyScan: 'Digitalize com a câmera do seu telefone ou com o app ZOREAL ID.',
    bodyApprove: 'Aprove o login no app ZOREAL ID.',
    bodyEnrolling: 'Termine de configurar o ZOREAL ID no seu telefone e depois aprove o login.',
    waiting: 'Aguardando digitalização',
    waitingApproval: 'Aguardando aprovação',
    expiresIn: 'Expira em {time}',
    secured: 'Verificação Proof-of-Human da ZOREAL',
    noIdTitle: 'Ainda não tem ZOREAL ID?',
    noIdBody: 'Digitalize o mesmo código para baixar o app e criar uma conta grátis. Leva só um minuto.',
    cancel: 'Cancelar',
    close: 'Fechar',
    qrAlt: 'Código QR para entrar com ZOREAL',
  },
  fr: {
    title: 'Scannez pour vous connecter',
    titleApprove: 'Approuvez sur votre téléphone',
    bodyScan: "Scannez avec l'appareil photo de votre téléphone ou l'app ZOREAL ID.",
    bodyApprove: 'Approuvez la connexion dans votre app ZOREAL ID.',
    bodyEnrolling: 'Terminez la configuration de ZOREAL ID sur votre téléphone, puis approuvez la connexion.',
    waiting: 'En attente du scan',
    waitingApproval: "En attente d'approbation",
    expiresIn: 'Expire dans {time}',
    secured: 'Vérification Proof-of-Human par ZOREAL',
    noIdTitle: "Pas encore de ZOREAL ID ?",
    noIdBody: "Scannez le même code pour télécharger l'app et en créer un gratuitement. Cela prend une minute.",
    cancel: 'Annuler',
    close: 'Fermer',
    qrAlt: 'Code QR pour se connecter avec ZOREAL',
  },
  de: {
    title: 'Zum Anmelden scannen',
    titleApprove: 'Auf dem Handy bestätigen',
    bodyScan: 'Mit der Handykamera oder der ZOREAL ID App scannen.',
    bodyApprove: 'Anmeldung in der ZOREAL ID App bestätigen.',
    bodyEnrolling: 'ZOREAL ID auf dem Handy fertig einrichten und dann die Anmeldung bestätigen.',
    waiting: 'Warten auf Scan',
    waitingApproval: 'Warten auf Bestätigung',
    expiresIn: 'Läuft ab in {time}',
    secured: 'Proof-of-Human-Verifizierung von ZOREAL',
    noIdTitle: 'Noch keine ZOREAL ID?',
    noIdBody: 'Denselben Code scannen, um die App zu laden und kostenlos eine zu erstellen. Dauert nur eine Minute.',
    cancel: 'Abbrechen',
    close: 'Schließen',
    qrAlt: 'QR-Code für die Anmeldung mit ZOREAL',
  },
  ru: {
    title: 'Отсканируйте, чтобы войти',
    titleApprove: 'Подтвердите на телефоне',
    bodyScan: 'Отсканируйте камерой телефона или через приложение ZOREAL ID.',
    bodyApprove: 'Подтвердите вход в приложении ZOREAL ID.',
    bodyEnrolling: 'Завершите настройку ZOREAL ID на телефоне, затем подтвердите вход.',
    waiting: 'Ожидание сканирования',
    waitingApproval: 'Ожидание подтверждения',
    expiresIn: 'Истекает через {time}',
    secured: 'Проверка Proof-of-Human от ZOREAL',
    noIdTitle: 'Ещё нет ZOREAL ID?',
    noIdBody: 'Отсканируйте тот же код, чтобы скачать приложение и создать его бесплатно. Это займёт минуту.',
    cancel: 'Отмена',
    close: 'Закрыть',
    qrAlt: 'QR-код для входа через ZOREAL',
  },
  ja: {
    title: 'スキャンしてログイン',
    titleApprove: 'スマートフォンで承認',
    bodyScan: 'スマートフォンのカメラまたはZOREAL IDアプリでスキャンしてください。',
    bodyApprove: 'ZOREAL IDアプリでログインを承認してください。',
    bodyEnrolling: 'スマートフォンでZOREAL IDの設定を完了し、ログインを承認してください。',
    waiting: 'スキャン待ち',
    waitingApproval: '承認待ち',
    expiresIn: '有効期限まで {time}',
    secured: 'ZOREALによるProof-of-Human認証',
    noIdTitle: 'ZOREAL IDをお持ちでないですか？',
    noIdBody: '同じコードをスキャンしてアプリをダウンロードし、無料で作成できます。1分ほどで完了します。',
    cancel: 'キャンセル',
    close: '閉じる',
    qrAlt: 'ZOREALでログインするためのQRコード',
  },
  hi: {
    title: 'साइन इन करने के लिए स्कैन करें',
    titleApprove: 'अपने फोन पर स्वीकृत करें',
    bodyScan: 'अपने फोन के कैमरे या ZOREAL ID ऐप से स्कैन करें।',
    bodyApprove: 'अपने ZOREAL ID ऐप में लॉगिन स्वीकृत करें।',
    bodyEnrolling: 'अपने फोन पर ZOREAL ID सेटअप पूरा करें, फिर लॉगिन स्वीकृत करें।',
    waiting: 'स्कैन की प्रतीक्षा है',
    waitingApproval: 'स्वीकृति की प्रतीक्षा है',
    expiresIn: '{time} में समाप्त',
    secured: 'ZOREAL द्वारा Proof-of-Human सत्यापन',
    noIdTitle: 'अभी तक ZOREAL ID नहीं है?',
    noIdBody: 'ऐप डाउनलोड करने और मुफ्त में एक बनाने के लिए वही कोड स्कैन करें। इसमें बस एक मिनट लगता है।',
    cancel: 'रद्द करें',
    close: 'बंद करें',
    qrAlt: 'ZOREAL से साइन इन करने के लिए QR कोड',
  },
  zhs: {
    title: '扫码登录',
    titleApprove: '在手机上批准',
    bodyScan: '使用手机相机或 ZOREAL ID 应用扫描。',
    bodyApprove: '请在 ZOREAL ID 应用中批准登录。',
    bodyEnrolling: '请在手机上完成 ZOREAL ID 设置，然后批准登录。',
    waiting: '等待扫描',
    waitingApproval: '等待批准',
    expiresIn: '{time} 后失效',
    secured: '由 ZOREAL 提供的 Proof-of-Human 验证',
    noIdTitle: '还没有 ZOREAL ID？',
    noIdBody: '扫描同一个二维码即可下载应用并免费创建，只需一分钟。',
    cancel: '取消',
    close: '关闭',
    qrAlt: '使用 ZOREAL 登录的二维码',
  },
  zht: {
    title: '掃碼登入',
    titleApprove: '在手機上核准',
    bodyScan: '使用手機相機或 ZOREAL ID 應用程式掃描。',
    bodyApprove: '請在 ZOREAL ID 應用程式中核准登入。',
    bodyEnrolling: '請在手機上完成 ZOREAL ID 設定，然後核准登入。',
    waiting: '等待掃描',
    waitingApproval: '等待核准',
    expiresIn: '{time} 後失效',
    secured: '由 ZOREAL 提供的 Proof-of-Human 驗證',
    noIdTitle: '還沒有 ZOREAL ID？',
    noIdBody: '掃描同一個 QR code 即可下載應用程式並免費建立，只需一分鐘。',
    cancel: '取消',
    close: '關閉',
    qrAlt: '使用 ZOREAL 登入的 QR code',
  },
  ar: {
    title: 'امسح لتسجيل الدخول',
    titleApprove: 'وافق على هاتفك',
    bodyScan: 'امسح باستخدام كاميرا هاتفك أو تطبيق ZOREAL ID.',
    bodyApprove: 'وافق على تسجيل الدخول في تطبيق ZOREAL ID.',
    bodyEnrolling: 'أكمل إعداد ZOREAL ID على هاتفك، ثم وافق على تسجيل الدخول.',
    waiting: 'في انتظار المسح',
    waitingApproval: 'في انتظار الموافقة',
    expiresIn: 'تنتهي الصلاحية خلال {time}',
    secured: 'التحقق من Proof-of-Human بواسطة ZOREAL',
    noIdTitle: 'ليس لديك ZOREAL ID بعد؟',
    noIdBody: 'امسح الرمز نفسه لتنزيل التطبيق وإنشاء حساب مجاني. يستغرق الأمر دقيقة واحدة فقط.',
    cancel: 'إلغاء',
    close: 'إغلاق',
    qrAlt: 'رمز QR لتسجيل الدخول باستخدام ZOREAL',
  },
  ko: {
    title: '스캔하여 로그인',
    titleApprove: '휴대폰에서 승인',
    bodyScan: '휴대폰 카메라 또는 ZOREAL ID 앱으로 스캔하세요.',
    bodyApprove: 'ZOREAL ID 앱에서 로그인을 승인하세요.',
    bodyEnrolling: '휴대폰에서 ZOREAL ID 설정을 완료한 후 로그인을 승인하세요.',
    waiting: '스캔 대기 중',
    waitingApproval: '승인 대기 중',
    expiresIn: '{time} 후 만료',
    secured: 'ZOREAL의 Proof-of-Human 인증',
    noIdTitle: '아직 ZOREAL ID가 없으신가요?',
    noIdBody: '같은 코드를 스캔해 앱을 내려받고 무료로 만드세요. 1분이면 됩니다.',
    cancel: '취소',
    close: '닫기',
    qrAlt: 'ZOREAL로 로그인하기 위한 QR 코드',
  },
};

/** Locales whose script runs right to left, so the dialog flips with `dir`. */
const RTL = new Set(['ar', 'he', 'fa', 'ur']);

/**
 * One BCP 47 tag to a translation, or undefined if we do not carry it.
 *
 * Chinese is the only case needing more than the primary subtag: `zh-Hans` /
 * `zh-CN` / `zh-SG` are Simplified, everything else `zh` is treated as
 * Traditional, matching how the pairing page splits them.
 */
function lookup(locale: string): PairingStrings | undefined {
  const tag = locale.toLowerCase().replace(/_/g, '-');
  const primary = tag.split('-')[0];

  if (primary === 'zh') {
    const simplified = /(^|-)(hans|cn|sg|my)(-|$)/.test(tag);
    return TRANSLATIONS[simplified ? 'zhs' : 'zht'];
  }
  return TRANSLATIONS[tag] ?? TRANSLATIONS[primary];
}

/**
 * What the browser says the person reads, best first. `languages` is the whole
 * ordered preference list, which matters: someone whose first choice we do not
 * carry may well have a second we do, and falling straight to English would
 * skip it.
 */
function browserLocales(): string[] {
  if (typeof navigator === 'undefined') return [];
  const nav = navigator as Navigator & { languages?: readonly string[] };
  if (nav.languages && nav.languages.length) return [...nav.languages];
  return nav.language ? [nav.language] : [];
}

/**
 * The strings to render.
 *
 * An explicit `locale` (from the provider) wins outright: the host app knows
 * which language it is currently showing, and the modal must not disagree with
 * the page it opened on. With none given we follow the browser's own preference
 * list, so an integrator who never sets `locale` still gets a translated modal
 * instead of English-by-default. Anything we do not carry falls back to English
 * rather than rendering a key.
 */
export function strings(locale?: string): PairingStrings {
  if (locale) return lookup(locale) ?? en;
  for (const candidate of browserLocales()) {
    const hit = lookup(candidate);
    if (hit) return hit;
  }
  return en;
}

export function isRtl(locale?: string): boolean {
  const tag = locale ?? browserLocales()[0];
  if (!tag) return false;
  return RTL.has(tag.toLowerCase().replace(/_/g, '-').split('-')[0]);
}

/** The one substitution the copy needs. */
export function interpolate(template: string, time: string): string {
  return template.replace('{time}', time);
}
