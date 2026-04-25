import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';

const MAX_FILES = 3;
const MAX_MB = 5;

export default function SubmitPage() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'Medium',
    ward: '',
    location: '',
    contactPhone: '',
    contactEmail: ''
  });
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const { data } = await api.get('/categories');
        setCategories(data.categories || []);
      } catch {
        setCategories([]);
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    const nextPreviews = images.map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file)
    }));

    setPreviews(nextPreviews);

    return () => {
      nextPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [images]);

  const update = (k, v) => {
    setForm((s) => ({ ...s, [k]: v }));
    setErrors((prev) => ({ ...prev, [k]: '', form: '' }));
  };

  const onPickImages = (event) => {
    const picked = Array.from(event.target.files || []);

    if (picked.length === 0) return;
    if (picked.length > MAX_FILES) {
      setErrors((prev) => ({ ...prev, images: `Select up to ${MAX_FILES} images`, form: '' }));
      event.target.value = '';
      return;
    }

    const oversized = picked.find((file) => file.size > MAX_MB * 1024 * 1024);
    if (oversized) {
      setErrors((prev) => ({ ...prev, images: `Each image must be ${MAX_MB}MB or smaller`, form: '' }));
      event.target.value = '';
      return;
    }

    const invalid = picked.find((file) => !file.type.startsWith('image/'));
    if (invalid) {
      setErrors((prev) => ({ ...prev, images: 'Only image files are allowed', form: '' }));
      event.target.value = '';
      return;
    }

    setErrors((prev) => ({ ...prev, images: '', form: '' }));
    setImages(picked);
  };

  const submit = async () => {
    const nextErrors = {};
    if (!form.title.trim()) nextErrors.title = 'Title is required.';
    if (!form.category.trim()) nextErrors.category = 'Category is required.';
    if (!form.ward.trim()) nextErrors.ward = 'Ward is required.';
    if (!form.location.trim()) nextErrors.location = 'Location is required.';
    if (!form.description.trim()) nextErrors.description = 'Description is required.';
    if (images.length === 0) nextErrors.images = 'Please upload at least one image.';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    try {
      setErrors({});
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('description', form.description);
      formData.append('category', form.category);
      formData.append('priority', form.priority);
      formData.append('ward', form.ward);
      formData.append('location', form.location);
      formData.append('contactPhone', form.contactPhone);
      formData.append('contactEmail', form.contactEmail);
      images.forEach((file) => formData.append('images', file));

      await api.post('/complaints', formData);
      toast.success('Complaint created');
      setForm({
        title: '',
        description: '',
        category: '',
        priority: 'Medium',
        ward: '',
        location: '',
        contactPhone: '',
        contactEmail: ''
      });
      setImages([]);
      setErrors({});
    } catch (error) {
      setErrors({
        form: error?.response?.data?.message || 'Create failed'
      });
    }
  };

  return (
    <section className="soft-card soft-card-primary p-4">
      <h2 className="font-display text-lg font-semibold text-white">Submit complaint</h2>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <div>
          <input className={`input ${errors.title ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-200' : ''}`} placeholder="Title *" value={form.title} onChange={(e) => update('title', e.target.value)} />
          {errors.title && <p className="mt-1 text-xs text-rose-600">{errors.title}</p>}
        </div>
        <div>
          <select className={`input ${errors.category ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-200' : ''}`} value={form.category} onChange={(e) => update('category', e.target.value)}>
            <option value="">Select Category *</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat.name}>{cat.name}</option>
            ))}
          </select>
          {errors.category && <p className="mt-1 text-xs text-rose-600">{errors.category}</p>}
        </div>
        <div>
          <input className={`input ${errors.ward ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-200' : ''}`} placeholder="Ward *" value={form.ward} onChange={(e) => update('ward', e.target.value)} />
          {errors.ward && <p className="mt-1 text-xs text-rose-600">{errors.ward}</p>}
        </div>
        <div>
          <input className={`input ${errors.location ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-200' : ''}`} placeholder="Location *" value={form.location} onChange={(e) => update('location', e.target.value)} />
          {errors.location && <p className="mt-1 text-xs text-rose-600">{errors.location}</p>}
        </div>
        <select className="input" value={form.priority} onChange={(e) => update('priority', e.target.value)}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select>
        <input className="input" placeholder="Contact Phone" value={form.contactPhone} onChange={(e) => update('contactPhone', e.target.value)} />
        <input className="input md:col-span-2" placeholder="Contact Email" value={form.contactEmail} onChange={(e) => update('contactEmail', e.target.value)} />
        <div className="md:col-span-2">
          <textarea className={`input md:col-span-2 min-h-[120px] ${errors.description ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-200' : ''}`} placeholder="Description *" value={form.description} onChange={(e) => update('description', e.target.value)} />
          {errors.description && <p className="mt-1 text-xs text-rose-600">{errors.description}</p>}
        </div>

        <div className="soft-card-secondary md:col-span-2 rounded-2xl border p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-white/65">Complaint Images (Required)</p>
          <p className="mt-1 text-xs text-white/65">Upload 1 to {MAX_FILES} images, up to {MAX_MB}MB each.</p>
          <input className={`input mt-2 ${errors.images ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-200' : ''}`} type="file" accept="image/*" multiple onChange={onPickImages} />
          {errors.images && <p className="mt-1 text-xs text-rose-600">{errors.images}</p>}
          {errors.form && <p className="mt-1 text-xs text-rose-600">{errors.form}</p>}

          {previews.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
              {previews.map((preview) => (
                <div key={preview.name} className="soft-card-tertiary overflow-hidden rounded-xl border">
                  <img src={preview.url} alt={preview.name} className="h-24 w-full object-cover" />
                  <p className="truncate px-2 py-1 text-[11px] text-white/70">{preview.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <button onClick={submit} className="btn-primary mt-3">Submit</button>
    </section>
  );
}
