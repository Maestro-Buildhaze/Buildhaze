import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Palette, 
  Type, 
  Image, 
  FileText, 
  BarChart3, 
  Settings, 
  Globe,
  Layers,
  ChevronRight,
  Save,
  Eye,
  Smartphone,
  Monitor,
  Upload,
  Plus,
  Trash2,
  GripVertical
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { toast } from 'sonner';

// Types
interface TemplateSection {
  id: string;
  name: string;
  fields: TemplateField[];
  canAddRemove: boolean;
}

interface TemplateField {
  id: string;
  type: 'text' | 'textarea' | 'richtext' | 'image' | 'video' | 'color' | 'select' | 'repeater' | 'link';
  label: string;
  selector: string;
  attribute?: string;
  defaultValue?: any;
  options?: string[];
  helpText?: string;
}

interface SiteData {
  client: {
    id: string;
    businessName: string;
    email: string;
    plan: string;
  };
  template: {
    id: string;
    name: string;
    schema: any;
    pages: { id: string; name: string; file: string }[];
    sections: TemplateSection[];
  } | null;
  configs: Record<string, { value: string; type: string; jsonValue?: any }>;
  media: { id: string; name: string; url: string; folder: string }[];
}

export function CMSDashboard() {
  const { clientId } = useParams<{ clientId: string }>();
  const [activeTab, setActiveTab] = useState<'content' | 'design' | 'media' | 'pages' | 'seo' | 'stats'>('content');
  const [activePage, setActivePage] = useState<string>('index');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const queryClient = useQueryClient();

  // Fetch site data
  const { data: siteData, isLoading } = useQuery({
    queryKey: ['site-data', clientId],
    queryFn: async () => {
      const res = await api.get(`/site/${clientId}/data`);
      return res.data.data as SiteData;
    },
    enabled: !!clientId,
  });

  // Save config mutation
  const saveConfig = useMutation({
    mutationFn: async (configs: { key: string; value: any; type?: string; jsonValue?: any }[]) => {
      const res = await api.post(`/site/${clientId}/config/batch`, { configs });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-data', clientId] });
      toast.success('Changes saved successfully!');
      setUnsavedChanges(false);
    },
    onError: () => {
      toast.error('Failed to save changes');
    },
  });

  if (isLoading || !siteData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  const activePageData = siteData.template?.pages.find(p => p.id === activePage);
  const pageSections = siteData.template?.sections.filter(s => 
    activePageData?.file.includes(s.id) || s.id.startsWith(activePage)
  ) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-gray-900">{siteData.client.businessName}</span>
            </div>
            <div className="h-6 w-px bg-gray-200" />
            <nav className="flex items-center gap-1">
              <TabButton 
                active={activeTab === 'content'} 
                onClick={() => setActiveTab('content')}
                icon={<FileText className="w-4 h-4" />}
                label="Content"
              />
              <TabButton 
                active={activeTab === 'design'} 
                onClick={() => setActiveTab('design')}
                icon={<Palette className="w-4 h-4" />}
                label="Design"
              />
              <TabButton 
                active={activeTab === 'pages'} 
                onClick={() => setActiveTab('pages')}
                icon={<Layers className="w-4 h-4" />}
                label="Pages"
              />
              <TabButton 
                active={activeTab === 'media'} 
                onClick={() => setActiveTab('media')}
                icon={<Image className="w-4 h-4" />}
                label="Media"
              />
              <TabButton 
                active={activeTab === 'seo'} 
                onClick={() => setActiveTab('seo')}
                icon={<Settings className="w-4 h-4" />}
                label="SEO"
              />
              <TabButton 
                active={activeTab === 'stats'} 
                onClick={() => setActiveTab('stats')}
                icon={<BarChart3 className="w-4 h-4" />}
                label="Analytics"
              />
            </nav>
          </div>
          
          <div className="flex items-center gap-3">
            {unsavedChanges && (
              <span className="text-sm text-amber-600 font-medium">
                Unsaved changes
              </span>
            )}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setPreviewMode('desktop')}
                className={`p-2 rounded ${previewMode === 'desktop' ? 'bg-white shadow-sm' : ''}`}
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPreviewMode('mobile')}
                className={`p-2 rounded ${previewMode === 'mobile' ? 'bg-white shadow-sm' : ''}`}
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>
            <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">
              <Eye className="w-4 h-4" />
              Preview
            </button>
            <button 
              onClick={() => saveConfig.mutate([])}
              disabled={!unsavedChanges || saveConfig.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saveConfig.isPending ? 'Saving...' : 'Publish'}
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Page Selector for Content Tab */}
        {activeTab === 'content' && siteData.template?.pages && (
          <aside className="w-64 bg-white border-r min-h-[calc(100vh-56px)]">
            <div className="p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Pages
              </h3>
              <div className="space-y-1">
                {siteData.template.pages.map((page) => (
                  <button
                    key={page.id}
                    onClick={() => setActivePage(page.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      activePage === page.id 
                        ? 'bg-orange-50 text-orange-700' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span className="flex-1 text-left">{page.name}</span>
                    <ChevronRight className={`w-4 h-4 ${activePage === page.id ? 'opacity-100' : 'opacity-0'}`} />
                  </button>
                ))}
              </div>
            </div>
            
            <div className="p-4 border-t">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Sections on this page
              </h3>
              <div className="space-y-1">
                {pageSections.map((section) => (
                  <button
                    key={section.id}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <GripVertical className="w-4 h-4 text-gray-400" />
                    <span className="flex-1 text-left">{section.name}</span>
                    {section.canAddRemove && (
                      <Plus className="w-4 h-4 text-gray-400 hover:text-orange-600" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 p-6">
          {activeTab === 'content' && (
            <div className="max-w-3xl">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">{activePageData?.name}</h1>
                <p className="text-gray-500 mt-1">Edit content sections for this page</p>
              </div>

              {/* Section Editors */}
              <div className="space-y-6">
                {pageSections.map((section) => (
                  <SectionEditor 
                    key={section.id} 
                    section={section}
                    configs={siteData.configs}
                    onChange={() => setUnsavedChanges(true)}
                  />
                ))}
                
                {pageSections.length === 0 && (
                  <div className="bg-white rounded-xl border p-12 text-center">
                    <Layers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No sections detected</h3>
                    <p className="text-gray-500 max-w-md mx-auto">
                      The template parser didn't find any editable sections on this page. 
                      Try regenerating the template schema from the admin panel.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'design' && (
            <DesignTab 
              configs={siteData.configs} 
              onChange={() => setUnsavedChanges(true)}
            />
          )}

          {activeTab === 'media' && (
            <MediaTab 
              media={siteData.media}
              clientId={clientId!}
            />
          )}

          {activeTab === 'stats' && (
            <StatsTab clientId={clientId!} />
          )}

          {activeTab === 'seo' && (
            <SEOTab 
              configs={siteData.configs}
              onChange={() => setUnsavedChanges(true)}
            />
          )}

          {activeTab === 'pages' && (
            <PagesTab 
              pages={siteData.template?.pages || []}
              configs={siteData.configs}
            />
          )}
        </main>
      </div>
    </div>
  );
}

// Tab Button Component
function TabButton({ active, onClick, icon, label }: { 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        active 
          ? 'bg-orange-50 text-orange-700' 
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// Section Editor Component
function SectionEditor({ section, configs, onChange }: { 
  section: TemplateSection; 
  configs: Record<string, { value: string; type: string }>;
  onChange: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <GripVertical className="w-5 h-5 text-gray-400" />
          <h3 className="font-semibold text-gray-900">{section.name}</h3>
          {section.canAddRemove && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
              Repeatable
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {section.canAddRemove && (
            <button 
              onClick={(e) => { e.stopPropagation(); }}
              className="p-1 hover:bg-gray-200 rounded"
            >
              <Plus className="w-4 h-4 text-gray-600" />
            </button>
          )}
          <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </div>
      </button>
      
      {isExpanded && (
        <div className="border-t p-4 space-y-4">
          {section.fields.map((field) => (
            <FieldEditor 
              key={field.id} 
              field={field}
              value={configs[field.id]?.value || field.defaultValue}
              onChange={onChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Field Editor Component
function FieldEditor({ field, value, onChange }: { 
  field: TemplateField; 
  value: any; 
  onChange: () => void;
}) {
  const handleChange = (newValue: any) => {
    onChange();
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {field.label}
      </label>
      
      {field.type === 'text' && (
        <input
          type="text"
          defaultValue={value}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        />
      )}
      
      {field.type === 'textarea' && (
        <textarea
          defaultValue={value}
          rows={3}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        />
      )}
      
      {field.type === 'image' && (
        <div className="flex items-center gap-3">
          {value && (
            <img src={value} alt="" className="w-20 h-20 object-cover rounded-lg border" />
          )}
          <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
            <Upload className="w-4 h-4" />
            Choose Image
          </button>
        </div>
      )}
      
      {field.type === 'color' && (
        <div className="flex items-center gap-3">
          <input
            type="color"
            defaultValue={value || '#000000'}
            onChange={(e) => handleChange(e.target.value)}
            className="w-12 h-10 rounded cursor-pointer"
          />
          <input
            type="text"
            defaultValue={value}
            onChange={(e) => handleChange(e.target.value)}
            className="flex-1 px-3 py-2 border rounded-lg"
          />
        </div>
      )}
      
      {field.type === 'select' && field.options && (
        <select
          defaultValue={value}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
        >
          {field.options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )}
      
      {field.type === 'link' && (
        <input
          type="text"
          defaultValue={value}
          placeholder="https://..."
          onChange={(e) => handleChange(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
        />
      )}
      
      {field.helpText && (
        <p className="text-xs text-gray-500">{field.helpText}</p>
      )}
    </div>
  );
}

// Design Tab
function DesignTab({ configs, onChange }: { configs: Record<string, any>; onChange: () => void }) {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Design Settings</h2>
        <p className="text-gray-500">Customize colors, fonts, and global styles</p>
      </div>

      <div className="bg-white rounded-xl border p-6 space-y-6">
        <div>
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Brand Colors
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
              <div className="flex items-center gap-3">
                <input type="color" defaultValue="#f97316" className="w-12 h-10 rounded" onChange={onChange} />
                <input type="text" defaultValue="#f97316" className="flex-1 px-3 py-2 border rounded-lg" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Color</label>
              <div className="flex items-center gap-3">
                <input type="color" defaultValue="#10b981" className="w-12 h-10 rounded" onChange={onChange} />
                <input type="text" defaultValue="#10b981" className="flex-1 px-3 py-2 border rounded-lg" />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Type className="w-5 h-5" />
            Typography
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Heading Font</label>
              <select className="w-full px-3 py-2 border rounded-lg" onChange={onChange}>
                <option>Inter</option>
                <option>Playfair Display</option>
                <option>Montserrat</option>
                <option>Roboto</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Body Font</label>
              <select className="w-full px-3 py-2 border rounded-lg" onChange={onChange}>
                <option>Inter</option>
                <option>Open Sans</option>
                <option>Lato</option>
                <option>Roboto</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Media Tab
function MediaTab({ media, clientId }: { media: { id: string; name: string; url: string; folder: string }[]; clientId: string }) {
  const [uploading, setUploading] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Media Library</h2>
          <p className="text-gray-500">Manage images, videos, and files</p>
        </div>
        <button 
          onClick={() => setUploading(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
        >
          <Upload className="w-4 h-4" />
          Upload Media
        </button>
      </div>

      {media.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <Image className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No media yet</h3>
          <p className="text-gray-500">Upload images and videos to use in your site</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {media.map((item) => (
            <div key={item.id} className="group bg-white rounded-xl border overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-square bg-gray-100 relative">
                <img 
                  src={item.url} 
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button className="p-2 bg-white rounded-full text-gray-700 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                <p className="text-xs text-gray-500">{item.folder}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Stats Tab
function StatsTab({ clientId }: { clientId: string }) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['site-statistics', clientId],
    queryFn: async () => {
      const res = await api.get(`/site/${clientId}/statistics`);
      return res.data.statistics;
    },
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Site Analytics</h2>
        <p className="text-gray-500">Real-time statistics from Cloudflare</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          title="Total Visits" 
          value={stats?.totalVisits?.toLocaleString() || '0'}
          icon={<BarChart3 className="w-5 h-5" />}
        />
        <StatCard 
          title="Unique Visitors" 
          value={stats?.uniqueVisitors?.toLocaleString() || '0'}
          icon={<Globe className="w-5 h-5" />}
        />
        <StatCard 
          title="Page Views" 
          value={stats?.pageViews?.toLocaleString() || '0'}
          icon={<FileText className="w-5 h-5" />}
        />
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-gray-500">{title}</span>
        <div className="p-2 bg-orange-50 rounded-lg text-orange-600">{icon}</div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

// SEO Tab
function SEOTab({ configs, onChange }: { configs: Record<string, any>; onChange: () => void }) {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">SEO Settings</h2>
        <p className="text-gray-500">Optimize your site for search engines</p>
      </div>

      <div className="bg-white rounded-xl border p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Site Title</label>
          <input
            type="text"
            defaultValue={configs['site-title']?.value}
            placeholder="My Business Name"
            onChange={onChange}
            className="w-full px-3 py-2 border rounded-lg"
          />
          <p className="text-xs text-gray-500 mt-1">Appears in browser tab and search results</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Meta Description</label>
          <textarea
            rows={3}
            defaultValue={configs['meta-description']?.value}
            placeholder="Brief description of your business..."
            onChange={onChange}
            className="w-full px-3 py-2 border rounded-lg"
          />
          <p className="text-xs text-gray-500 mt-1">Recommended: 150-160 characters</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Social Share Image</label>
          <div className="flex items-center gap-3">
            {configs['og-image']?.value && (
              <img 
                src={configs['og-image'].value} 
                alt="" 
                className="w-20 h-20 object-cover rounded-lg border"
              />
            )}
            <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
              <Upload className="w-4 h-4" />
              Upload Image
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">Recommended: 1200x630px</p>
        </div>
      </div>
    </div>
  );
}

// Pages Tab
function PagesTab({ pages, configs }: { pages: { id: string; name: string; file: string }[]; configs: Record<string, any> }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Pages</h2>
          <p className="text-gray-500">Manage your site pages and navigation</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
          <Plus className="w-4 h-4" />
          Add Page
        </button>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        {pages.map((page, index) => (
          <div key={page.id} className="flex items-center gap-4 p-4 border-b last:border-b-0 hover:bg-gray-50">
            <GripVertical className="w-5 h-5 text-gray-400" />
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">{page.name}</h3>
              <p className="text-sm text-gray-500">/{page.file.replace('.html', '')}</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-gray-200 rounded-lg">
                <Settings className="w-4 h-4 text-gray-600" />
              </button>
              {pages.length > 1 && (
                <button className="p-2 hover:bg-gray-200 rounded-lg">
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
