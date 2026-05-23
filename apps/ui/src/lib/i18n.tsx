import { createContext, useContext, useState, useEffect } from 'react';

export type Lang = 'en' | 'ro' | 'de';

const T = {
  en: {
    // Nav
    dashboard: 'Dashboard',
    site: 'Site & Pages',
    blog: 'Blog',
    media: 'Media',
    settings: 'Settings',
    signOut: 'Sign out',
    // Auth
    welcomeBack: 'Welcome back',
    signInSubtitle: 'Sign in to manage your website',
    emailAddress: 'Email address',
    password: 'Password',
    signingIn: 'Signing in…',
    signIn: 'Sign in',
    poweredBy: 'Powered by SiteCMS',
    // Dashboard
    welcomeMsg: (name: string) => `Good to see you, ${name}`,
    liveAt: (domain: string) => `Your site is live at ${domain}`,
    manageContent: 'Manage your website content',
    publishNow: 'Publish Now',
    publishing: 'Publishing…',
    publishedPosts: 'Published posts',
    drafts: 'drafts',
    mediaFiles: 'Media files',
    template: 'Template',
    lastPublished: 'Last published',
    never: 'Never',
    recentPosts: 'Recent Blog Posts',
    newPost: 'New post',
    noPosts: 'No blog posts yet',
    writeFirst: 'Write your first post',
    quickActions: 'Quick Actions',
    editSite: 'Edit Site Content',
    editSiteDesc: 'Update texts, colors, contact info',
    writeBlog: 'Write a Blog Post',
    writeBlogDesc: 'Share news, tips or stories',
    uploadMedia: 'Upload Media',
    uploadMediaDesc: 'Add photos and images',
    published: 'Published',
    draft: 'Draft',
    // Site editor
    sitePages: 'Site & Pages',
    siteSubtitle: 'Edit your website content and structure',
    saveChanges: 'Save Changes',
    saving: 'Saving…',
    saved: 'Saved!',
    siteSettings: 'Site Settings',
    pagesTitle: 'Pages & Sections',
    // Blog
    blogPosts: 'Blog Posts',
    newPost2: 'New Post',
    editPost: 'Edit Post',
    // Media
    mediaLibrary: 'Media Library',
    uploading: 'Uploading…',
    upload: 'Upload',
    dropImages: 'Drop images here or click to upload',
    imageTypes: 'JPG, PNG, WebP, GIF, SVG up to 10MB',
    noMedia: 'No media files yet',
    // Settings
    settingsTitle: 'Settings',
    settingsSubtitle: 'Manage your account preferences',
    accountInfo: 'Account Information',
    businessName: 'Business Name',
    plan: 'Plan',
    domain: 'Domain',
    changePassword: 'Change Password',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirmPassword: 'Confirm New Password',
    changing: 'Changing…',
    passwordChanged: 'Password changed successfully',
    passwordsNoMatch: 'New passwords do not match',
    passwordTooShort: 'New password must be at least 8 characters',
  },
  ro: {
    dashboard: 'Panou',
    site: 'Site & Pagini',
    blog: 'Blog',
    media: 'Media',
    settings: 'Setări',
    signOut: 'Deconectare',
    welcomeBack: 'Bine ai revenit',
    signInSubtitle: 'Autentifică-te pentru a gestiona site-ul',
    emailAddress: 'Adresă email',
    password: 'Parolă',
    signingIn: 'Se autentifică…',
    signIn: 'Autentificare',
    poweredBy: 'Realizat cu SiteCMS',
    welcomeMsg: (name: string) => `Bine ai revenit, ${name}`,
    liveAt: (domain: string) => `Site-ul tău este live la ${domain}`,
    manageContent: 'Gestionează conținutul site-ului',
    publishNow: 'Publică acum',
    publishing: 'Se publică…',
    publishedPosts: 'Articole publicate',
    drafts: 'ciorne',
    mediaFiles: 'Fișiere media',
    template: 'Șablon',
    lastPublished: 'Ultima publicare',
    never: 'Niciodată',
    recentPosts: 'Articole recente',
    newPost: 'Articol nou',
    noPosts: 'Niciun articol de blog',
    writeFirst: 'Scrie primul articol',
    quickActions: 'Acțiuni rapide',
    editSite: 'Editează conținutul',
    editSiteDesc: 'Texte, culori, date de contact',
    writeBlog: 'Scrie un articol',
    writeBlogDesc: 'Știri, sfaturi sau povești',
    uploadMedia: 'Încarcă media',
    uploadMediaDesc: 'Adaugă fotografii și imagini',
    published: 'Publicat',
    draft: 'Ciornă',
    sitePages: 'Site & Pagini',
    siteSubtitle: 'Editează conținutul și structura site-ului',
    saveChanges: 'Salvează modificările',
    saving: 'Se salvează…',
    saved: 'Salvat!',
    siteSettings: 'Setări site',
    pagesTitle: 'Pagini & Secțiuni',
    blogPosts: 'Articole blog',
    newPost2: 'Articol nou',
    editPost: 'Editează articolul',
    mediaLibrary: 'Bibliotecă media',
    uploading: 'Se încarcă…',
    upload: 'Încarcă',
    dropImages: 'Trage imaginile aici sau apasă pentru încărcare',
    imageTypes: 'JPG, PNG, WebP, GIF, SVG până la 10MB',
    noMedia: 'Niciun fișier media',
    settingsTitle: 'Setări',
    settingsSubtitle: 'Gestionează preferințele contului',
    accountInfo: 'Informații cont',
    businessName: 'Nume firmă',
    plan: 'Plan',
    domain: 'Domeniu',
    changePassword: 'Schimbă parola',
    currentPassword: 'Parola curentă',
    newPassword: 'Parolă nouă',
    confirmPassword: 'Confirmă parola nouă',
    changing: 'Se schimbă…',
    passwordChanged: 'Parola a fost schimbată',
    passwordsNoMatch: 'Parolele nu coincid',
    passwordTooShort: 'Parola trebuie să aibă minim 8 caractere',
  },
  de: {
    dashboard: 'Dashboard',
    site: 'Website & Seiten',
    blog: 'Blog',
    media: 'Medien',
    settings: 'Einstellungen',
    signOut: 'Abmelden',
    welcomeBack: 'Willkommen zurück',
    signInSubtitle: 'Melde dich an, um deine Website zu verwalten',
    emailAddress: 'E-Mail-Adresse',
    password: 'Passwort',
    signingIn: 'Anmeldung…',
    signIn: 'Anmelden',
    poweredBy: 'Powered by SiteCMS',
    welcomeMsg: (name: string) => `Schön, dich zu sehen, ${name}`,
    liveAt: (domain: string) => `Deine Website ist live unter ${domain}`,
    manageContent: 'Verwalte deine Website-Inhalte',
    publishNow: 'Jetzt veröffentlichen',
    publishing: 'Wird veröffentlicht…',
    publishedPosts: 'Veröffentlichte Beiträge',
    drafts: 'Entwürfe',
    mediaFiles: 'Mediendateien',
    template: 'Vorlage',
    lastPublished: 'Zuletzt veröffentlicht',
    never: 'Nie',
    recentPosts: 'Neueste Beiträge',
    newPost: 'Neuer Beitrag',
    noPosts: 'Noch keine Blogbeiträge',
    writeFirst: 'Ersten Beitrag schreiben',
    quickActions: 'Schnellzugriff',
    editSite: 'Inhalte bearbeiten',
    editSiteDesc: 'Texte, Farben, Kontaktdaten',
    writeBlog: 'Blogbeitrag schreiben',
    writeBlogDesc: 'Neuigkeiten, Tipps oder Geschichten',
    uploadMedia: 'Medien hochladen',
    uploadMediaDesc: 'Fotos und Bilder hinzufügen',
    published: 'Veröffentlicht',
    draft: 'Entwurf',
    sitePages: 'Website & Seiten',
    siteSubtitle: 'Bearbeite Inhalt und Struktur deiner Website',
    saveChanges: 'Änderungen speichern',
    saving: 'Wird gespeichert…',
    saved: 'Gespeichert!',
    siteSettings: 'Website-Einstellungen',
    pagesTitle: 'Seiten & Abschnitte',
    blogPosts: 'Blogbeiträge',
    newPost2: 'Neuer Beitrag',
    editPost: 'Beitrag bearbeiten',
    mediaLibrary: 'Medienbibliothek',
    uploading: 'Wird hochgeladen…',
    upload: 'Hochladen',
    dropImages: 'Bilder hier ablegen oder klicken zum Hochladen',
    imageTypes: 'JPG, PNG, WebP, GIF, SVG bis 10MB',
    noMedia: 'Noch keine Mediendateien',
    settingsTitle: 'Einstellungen',
    settingsSubtitle: 'Verwalte deine Kontoeinstellungen',
    accountInfo: 'Kontoinformationen',
    businessName: 'Unternehmensname',
    plan: 'Plan',
    domain: 'Domain',
    changePassword: 'Passwort ändern',
    currentPassword: 'Aktuelles Passwort',
    newPassword: 'Neues Passwort',
    confirmPassword: 'Neues Passwort bestätigen',
    changing: 'Wird geändert…',
    passwordChanged: 'Passwort erfolgreich geändert',
    passwordsNoMatch: 'Passwörter stimmen nicht überein',
    passwordTooShort: 'Passwort muss mindestens 8 Zeichen haben',
  },
} as const;

export type Translations = typeof T.en;

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Translations;
}

const I18nContext = createContext<I18nCtx>({} as I18nCtx);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem('cms_lang') as Lang | null;
    return stored ?? 'en';
  });

  function setLang(l: Lang) {
    setLangState(l);
    localStorage.setItem('cms_lang', l);
  }

  const t = T[lang] as Translations;

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
