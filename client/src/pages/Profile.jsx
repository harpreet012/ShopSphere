import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateProfile, changePassword } from '../services/authService';
import { fetchAddresses, addAddress, updateAddress, deleteAddress, setDefaultAddress } from '../services/addressService';
import { getErrorMessage } from '../services/api';
import { User, Lock, MapPin, Plus, Trash2, Star, Pencil } from 'lucide-react';

const TABS = [
  { id: 'info', label: 'Profile Info', icon: User },
  { id: 'password', label: 'Change Password', icon: Lock },
  { id: 'addresses', label: 'Addresses', icon: MapPin }
];

const emptyAddress = { label: 'Home', fullName: '', phone: '', line1: '', line2: '', city: '', state: '', postalCode: '', country: 'India' };

const Profile = () => {
  const { user, updateLocalUser } = useAuth();
  const [tab, setTab] = useState('info');

  // Profile info state
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [infoMsg, setInfoMsg] = useState('');
  const [infoError, setInfoError] = useState('');
  const [savingInfo, setSavingInfo] = useState(false);

  // Password state
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  // Addresses state
  const [addresses, setAddresses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [addrForm, setAddrForm] = useState(emptyAddress);
  const [addrError, setAddrError] = useState('');

  const loadAddresses = async () => {
    try {
      const res = await fetchAddresses();
      setAddresses(res.data.addresses);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (tab === 'addresses') loadAddresses();
  }, [tab]);

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    setInfoMsg('');
    setInfoError('');
    setSavingInfo(true);
    try {
      const res = await updateProfile({ name, phone });
      updateLocalUser(res.data.user);
      setInfoMsg('Profile updated successfully');
    } catch (err) {
      setInfoError(getErrorMessage(err));
    } finally {
      setSavingInfo(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMsg('');
    setPwError('');
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('New passwords do not match');
      return;
    }
    setSavingPw(true);
    try {
      await changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwMsg('Password changed successfully');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPwError(getErrorMessage(err));
    } finally {
      setSavingPw(false);
    }
  };

  const openAddForm = () => {
    setAddrForm(emptyAddress);
    setEditingId(null);
    setShowForm(true);
  };

  const openEditForm = (addr) => {
    setAddrForm(addr);
    setEditingId(addr._id);
    setShowForm(true);
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    setAddrError('');
    try {
      if (editingId) {
        const res = await updateAddress(editingId, addrForm);
        setAddresses(res.data.addresses);
      } else {
        const res = await addAddress(addrForm);
        setAddresses(res.data.addresses);
      }
      setShowForm(false);
    } catch (err) {
      setAddrError(getErrorMessage(err));
    }
  };

  const handleDeleteAddress = async (id) => {
    try {
      const res = await deleteAddress(id);
      setAddresses(res.data.addresses);
    } catch (err) {
      setAddrError(getErrorMessage(err));
    }
  };

  const handleSetDefault = async (id) => {
    try {
      const res = await setDefaultAddress(id);
      setAddresses(res.data.addresses);
    } catch (err) {
      setAddrError(getErrorMessage(err));
    }
  };

  return (
    <div className="container-app py-6 max-w-4xl">
      <h1 className="text-xl font-bold text-gray-800 mb-4">My Account</h1>

      <div className="grid md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <div className="card p-2">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded text-sm font-medium text-left ${tab === t.id ? 'bg-primary-light text-primary' : 'text-gray-600 hover:bg-muted'}`}
                >
                  <Icon size={16} /> {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="md:col-span-3">
          {tab === 'info' && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-800 mb-4">Profile Information</h2>
              {infoMsg && <p className="text-success text-sm mb-3">{infoMsg}</p>}
              {infoError && <p className="text-danger text-sm mb-3">{infoError}</p>}
              <form onSubmit={handleSaveInfo} className="space-y-4 max-w-md">
                <div>
                  <label className="label-text">Full Name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} className="input-field" required />
                </div>
                <div>
                  <label className="label-text">Email</label>
                  <input value={user?.email} disabled className="input-field bg-gray-100 cursor-not-allowed" />
                </div>
                <div>
                  <label className="label-text">Phone</label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input-field" />
                </div>
                <button type="submit" disabled={savingInfo} className="btn-primary">
                  {savingInfo ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          )}

          {tab === 'password' && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-800 mb-4">Change Password</h2>
              {pwMsg && <p className="text-success text-sm mb-3">{pwMsg}</p>}
              {pwError && <p className="text-danger text-sm mb-3">{pwError}</p>}
              <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                <div>
                  <label className="label-text">Current Password</label>
                  <input type="password" required value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="label-text">New Password</label>
                  <input type="password" required value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="label-text">Confirm New Password</label>
                  <input type="password" required value={pwForm.confirmPassword} onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })} className="input-field" />
                </div>
                <button type="submit" disabled={savingPw} className="btn-primary">
                  {savingPw ? 'Updating...' : 'Change Password'}
                </button>
              </form>
            </div>
          )}

          {tab === 'addresses' && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-800">Saved Addresses</h2>
                <button onClick={openAddForm} className="flex items-center gap-1 text-primary text-sm font-medium hover:underline">
                  <Plus size={15} /> Add Address
                </button>
              </div>
              {addrError && <p className="text-danger text-sm mb-3">{addrError}</p>}

              {showForm && (
                <form onSubmit={handleSaveAddress} className="border rounded p-4 mb-4 space-y-3 bg-muted/50">
                  <div className="grid grid-cols-2 gap-3">
                    <input required placeholder="Full Name" value={addrForm.fullName} onChange={(e) => setAddrForm({ ...addrForm, fullName: e.target.value })} className="input-field" />
                    <input required placeholder="Phone" value={addrForm.phone} onChange={(e) => setAddrForm({ ...addrForm, phone: e.target.value })} className="input-field" />
                  </div>
                  <input required placeholder="Address Line 1" value={addrForm.line1} onChange={(e) => setAddrForm({ ...addrForm, line1: e.target.value })} className="input-field" />
                  <input placeholder="Address Line 2 (optional)" value={addrForm.line2} onChange={(e) => setAddrForm({ ...addrForm, line2: e.target.value })} className="input-field" />
                  <div className="grid grid-cols-3 gap-3">
                    <input required placeholder="City" value={addrForm.city} onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })} className="input-field" />
                    <input required placeholder="State" value={addrForm.state} onChange={(e) => setAddrForm({ ...addrForm, state: e.target.value })} className="input-field" />
                    <input required placeholder="Postal Code" value={addrForm.postalCode} onChange={(e) => setAddrForm({ ...addrForm, postalCode: e.target.value })} className="input-field" />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="btn-primary text-sm">{editingId ? 'Update' : 'Save'} Address</button>
                    <button type="button" onClick={() => setShowForm(false)} className="btn-outline text-sm">Cancel</button>
                  </div>
                </form>
              )}

              {addresses.length === 0 ? (
                <p className="text-sm text-gray-500">No saved addresses yet.</p>
              ) : (
                <div className="space-y-3">
                  {addresses.map((addr) => (
                    <div key={addr._id} className="border rounded p-3 flex justify-between items-start gap-3">
                      <div className="text-sm">
                        <p className="font-medium text-gray-800 flex items-center gap-2">
                          {addr.fullName}
                          {addr.isDefault && <span className="text-[10px] bg-primary-light text-primary px-1.5 py-0.5 rounded font-semibold">DEFAULT</span>}
                        </p>
                        <p className="text-gray-600">{addr.line1}, {addr.line2 ? `${addr.line2}, ` : ''}{addr.city}, {addr.state} - {addr.postalCode}</p>
                        <p className="text-gray-500">Phone: {addr.phone}</p>
                      </div>
                      <div className="flex flex-col gap-2 items-end shrink-0">
                        <div className="flex gap-2">
                          <button onClick={() => openEditForm(addr)} className="text-gray-400 hover:text-primary" aria-label="Edit address"><Pencil size={14} /></button>
                          <button onClick={() => handleDeleteAddress(addr._id)} className="text-gray-400 hover:text-danger" aria-label="Delete address"><Trash2 size={14} /></button>
                        </div>
                        {!addr.isDefault && (
                          <button onClick={() => handleSetDefault(addr._id)} className="text-xs text-primary flex items-center gap-1 hover:underline">
                            <Star size={11} /> Set default
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
