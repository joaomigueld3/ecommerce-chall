'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import RequireAuth from '@/features/auth/RequireAuth';
import { useAuth } from '@/features/auth/AuthContext';
import { useStore } from '@/features/store/StoreContext';
import { changePassword, getUserById, updateUser } from '@/features/users/api';
import {
  createClient,
  createClientAddress,
  createClientPaymentMethod,
  deleteClientAddress,
  deleteClientPaymentMethod,
  getClientAddresses,
  getClientPaymentMethods,
  getClients,
  setDefaultClientPaymentMethod,
  updateClient,
  updateClientAddress,
} from '@/features/clients/api';
import { formatDate } from '@/lib/format';
import Loading from '@/components/ui/Loading';
import ErrorMessage from '@/components/ui/ErrorMessage';

const EMPTY_ADDRESS = {
  label: 'Home',
  recipientName: '',
  recipientPhone: '',
  country: 'BR',
  postalCode: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  isDefaultShipping: true,
};

const EMPTY_CARD = {
  brand: 'Visa',
  holderName: '',
  last4: '',
  expMonth: '12',
  expYear: '2029',
  nickname: '',
  isDefault: true,
};

function ProfileContent() {
  const { token, user, logout, updateStoredUser } = useAuth();
  const { formatMoney } = useStore();
  const router = useRouter();
  const userId = user?.id;

  const [activeTab, setActiveTab] = useState('account');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [message, setMessage] = useState(null);

  const [newPassword, setNewPassword] = useState('');
  const [passSubmitting, setPassSubmitting] = useState(false);
  const [passError, setPassError] = useState(null);
  const [passMessage, setPassMessage] = useState(null);

  const [clientRecord, setClientRecord] = useState(null);
  const [clientForm, setClientForm] = useState({
    fullName: '',
    contact: '',
    phone: '',
    email: '',
    country: 'BR',
    documentType: '',
    documentNumber: '',
    birthDate: '',
    address: '',
  });
  const [clientSubmitting, setClientSubmitting] = useState(false);
  const [clientError, setClientError] = useState(null);
  const [clientMessage, setClientMessage] = useState(null);

  const [addresses, setAddresses] = useState([]);
  const [addrForm, setAddrForm] = useState(EMPTY_ADDRESS);
  const [cepLoading, setCepLoading] = useState(false);
  const [addrFeedback, setAddrFeedback] = useState(null);
  const [addrError, setAddrError] = useState(null);

  const [paymentMethods, setPaymentMethods] = useState([]);
  const [cardForm, setCardForm] = useState(EMPTY_CARD);
  const [cardFeedback, setCardFeedback] = useState(null);
  const [cardError, setCardError] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      if (!userId) {
        setError('Could not determine the logged-in user. Log in again.');
        setLoading(false);
        return;
      }
      try {
        const [userData, clientsData] = await Promise.all([
          getUserById(token, userId),
          getClients(token).catch(() => ({ allClients: [] })),
        ]);
        if (ignore) return;

        setProfile(userData);
        setName(userData?.name ?? '');
        setEmail(userData?.email ?? '');

        const ownClient = (clientsData?.allClients ?? []).find(
          (c) => Number(c.userId) === Number(userId),
        ) || null;
        setClientRecord(ownClient);

        if (ownClient) {
          setClientForm({
            fullName: ownClient.fullName ?? '',
            contact: ownClient.contact ?? '',
            phone: ownClient.phone ?? '',
            email: ownClient.email ?? userData?.email ?? '',
            country: ownClient.country ?? 'BR',
            documentType: ownClient.documentType ?? '',
            documentNumber: ownClient.documentNumber ?? '',
            birthDate: ownClient.birthDate ?? '',
            address: ownClient.address ?? '',
          });

          const [addrRes, pmRes] = await Promise.all([
            getClientAddresses(token, ownClient.clientId).catch(() => ({ addresses: [] })),
            getClientPaymentMethods(token, ownClient.clientId).catch(() => ({ paymentMethods: [] })),
          ]);
          if (ignore) return;
          setAddresses(Array.isArray(addrRes?.addresses) ? addrRes.addresses : []);
          setPaymentMethods(Array.isArray(pmRes?.paymentMethods) ? pmRes.paymentMethods : []);
        } else {
          setClientForm((curr) => ({
            ...curr,
            fullName: curr.fullName || userData?.name || '',
            email: curr.email || userData?.email || '',
          }));
        }
        setError(null);
      } catch (err) {
        if (ignore) return;
        if (err.status === 401) {
          logout();
          router.replace('/login');
          return;
        }
        setError(err.message || 'Failed to load your profile.');
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [token, userId, reloadKey, logout, router]);

  function refresh() {
    setLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      const payload = { name: name.trim(), email: email.trim() };
      await updateUser(token, userId, payload);
      updateStoredUser(payload);
      setMessage('Profile updated successfully.');
      refresh();
    } catch (err) {
      setFormError(err.message || 'Failed to update your profile.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setPassError(null);
    setPassMessage(null);
    setPassSubmitting(true);
    try {
      await changePassword(token, { email: profile.email, password: newPassword });
      setNewPassword('');
      setPassMessage('Password changed successfully.');
    } catch (err) {
      setPassError(err.message || 'Failed to change password.');
    } finally {
      setPassSubmitting(false);
    }
  }

  async function handleClientSubmit(event) {
    event.preventDefault();
    setClientError(null);
    setClientMessage(null);
    setClientSubmitting(true);
    try {
      const payload = {
        fullName: clientForm.fullName.trim(),
        contact: clientForm.contact.trim(),
        phone: clientForm.phone.trim() || null,
        email: clientForm.email.trim() || null,
        country: clientForm.country,
        documentType: clientForm.documentType || null,
        documentNumber: clientForm.documentNumber.trim() || null,
        birthDate: clientForm.birthDate || null,
        address: clientForm.address.trim(),
      };
      if (clientRecord) {
        await updateClient(token, clientRecord.clientId, payload);
        setClientMessage('Client profile updated.');
      } else {
        await createClient(token, { ...payload, userId });
        setClientMessage('Client profile created.');
      }
      refresh();
    } catch (err) {
      setClientError(err.message || 'Failed to save client profile.');
    } finally {
      setClientSubmitting(false);
    }
  }

  async function handleViaCepLookup() {
    const digits = addrForm.postalCode.replace(/\D/g, '');
    if (digits.length !== 8) {
      setAddrError('Enter an 8-digit Brazilian CEP to auto-fill.');
      return;
    }
    setAddrError(null);
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) {
        setAddrError('CEP not found. Please fill address fields manually.');
      } else {
        setAddrForm((c) => ({
          ...c,
          street: data.logradouro || c.street,
          neighborhood: data.bairro || c.neighborhood,
          city: data.localidade || c.city,
          state: data.uf || c.state,
        }));
      }
    } catch {
      setAddrError('Could not reach ViaCEP. Fill address manually.');
    } finally {
      setCepLoading(false);
    }
  }

  async function handleAddressSubmit(event) {
    event.preventDefault();
    if (!clientRecord) return;
    setAddrError(null);
    setAddrFeedback(null);
    try {
      await createClientAddress(token, clientRecord.clientId, {
        ...addrForm,
        recipientName: addrForm.recipientName.trim() || clientRecord.fullName,
      });
      setAddrForm(EMPTY_ADDRESS);
      setAddrFeedback('Address saved.');
      refresh();
    } catch (err) {
      setAddrError(err.message || 'Failed to save address.');
    }
  }

  async function handleSetDefaultAddress(addressId) {
    if (!clientRecord) return;
    try {
      await updateClientAddress(token, clientRecord.clientId, addressId, { isDefaultShipping: true });
      setAddrFeedback('Default shipping address updated.');
      refresh();
    } catch (err) {
      setAddrError(err.message || 'Failed to update default address.');
    }
  }

  async function handleDeleteAddress(addressId) {
    if (!clientRecord) return;
    try {
      await deleteClientAddress(token, clientRecord.clientId, addressId);
      setAddrFeedback('Address removed.');
      refresh();
    } catch (err) {
      setAddrError(err.message || 'Failed to delete address.');
    }
  }

  async function handleCardSubmit(event) {
    event.preventDefault();
    if (!clientRecord) return;
    setCardError(null);
    setCardFeedback(null);
    try {
      await createClientPaymentMethod(token, clientRecord.clientId, {
        brand: cardForm.brand,
        holderName: cardForm.holderName.trim(),
        last4: cardForm.last4.trim(),
        expMonth: cardForm.expMonth ? Number(cardForm.expMonth) : null,
        expYear: cardForm.expYear ? Number(cardForm.expYear) : null,
        nickname: cardForm.nickname.trim() || null,
        isDefault: Boolean(cardForm.isDefault),
      });
      setCardForm(EMPTY_CARD);
      setCardFeedback('Payment method added to your wallet.');
      refresh();
    } catch (err) {
      setCardError(err.message || 'Failed to save payment method.');
    }
  }

  async function handleSetDefaultCard(paymentMethodId) {
    if (!clientRecord) return;
    try {
      await setDefaultClientPaymentMethod(token, clientRecord.clientId, paymentMethodId);
      setCardFeedback('Default payment method updated.');
      refresh();
    } catch (err) {
      setCardError(err.message || 'Failed to set default card.');
    }
  }

  async function handleDeleteCard(paymentMethodId) {
    if (!clientRecord) return;
    try {
      await deleteClientPaymentMethod(token, clientRecord.clientId, paymentMethodId);
      setCardFeedback('Payment method removed.');
      refresh();
    } catch (err) {
      setCardError(err.message || 'Failed to remove payment method.');
    }
  }

  if (loading) return <Loading message="Loading profile..." />;
  if (error) return <ErrorMessage message={error} onRetry={refresh} />;

  return (
    <section className="stack">
      <div className="page-header">
        <div>
          <h1>My Account &amp; Profile</h1>
          <p className="muted">
            {profile?.email} • Role: {profile?.type} • Member since {formatDate(profile?.createdAt)}
          </p>
        </div>
        <div className="chip-row">
          <button
            type="button"
            className={`chip ${activeTab === 'account' ? 'chip-active' : ''}`}
            onClick={() => setActiveTab('account')}
          >
            Account &amp; Profile
          </button>
          <button
            type="button"
            className={`chip ${activeTab === 'addresses' ? 'chip-active' : ''}`}
            onClick={() => setActiveTab('addresses')}
          >
            Addresses ({addresses.length})
          </button>
          <button
            type="button"
            className={`chip ${activeTab === 'wallet' ? 'chip-active' : ''}`}
            onClick={() => setActiveTab('wallet')}
          >
            Wallet &amp; Loyalty ({paymentMethods.length})
          </button>
          <Link href="/wishlist" className="chip">
            Wishlist →
          </Link>
        </div>
      </div>

      {activeTab === 'account' && (
        <div className="stack">
          <div className="card">
            <h2>Login Credentials</h2>
            {message && <p className="alert alert-success">{message}</p>}
            {formError && <p className="alert alert-error">{formError}</p>}

            <form onSubmit={handleSubmit} className="form">
              <div className="form-grid-2">
                <label htmlFor="name">
                  Name
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                </label>
                <label htmlFor="email">
                  Email
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </label>
              </div>
              <button type="submit" className="btn amz-btn-primary" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save changes'}
              </button>
            </form>
          </div>

          <div className="card">
            <h2>{clientRecord ? `Customer Profile (#${clientRecord.clientId})` : 'Create Customer Profile'}</h2>
            <p className="muted">Required for checkout, shipping addresses, wallet and wishlist.</p>
            {clientMessage && <p className="alert alert-success">{clientMessage}</p>}
            {clientError && <p className="alert alert-error">{clientError}</p>}

            <form onSubmit={handleClientSubmit} className="form">
              <div className="form-grid-2">
                <label htmlFor="client-full-name">
                  Full name
                  <input
                    id="client-full-name"
                    type="text"
                    value={clientForm.fullName}
                    onChange={(e) => setClientForm((c) => ({ ...c, fullName: e.target.value }))}
                    required
                  />
                </label>
                <label htmlFor="client-contact">
                  Contact ID / Primary Phone
                  <input
                    id="client-contact"
                    type="text"
                    value={clientForm.contact}
                    onChange={(e) => setClientForm((c) => ({ ...c, contact: e.target.value }))}
                    required
                  />
                </label>
                <label htmlFor="client-country">
                  Country / Region
                  <select
                    id="client-country"
                    value={clientForm.country}
                    onChange={(e) => setClientForm((c) => ({ ...c, country: e.target.value }))}
                  >
                    <option value="BR">Brasil (BR)</option>
                    <option value="US">United States (US)</option>
                    <option value="EU">Europe (EU)</option>
                  </select>
                </label>
                <label htmlFor="client-doc-type">
                  Document Type
                  <select
                    id="client-doc-type"
                    value={clientForm.documentType}
                    onChange={(e) => setClientForm((c) => ({ ...c, documentType: e.target.value }))}
                  >
                    <option value="">None</option>
                    <option value="CPF">CPF (Brazil)</option>
                    <option value="CNPJ">CNPJ (Brazil)</option>
                    <option value="TAX_ID">Tax ID — SSN / EIN (US)</option>
                    <option value="VAT_ID">VAT ID (Europe)</option>
                  </select>
                </label>
                <label htmlFor="client-doc-num">
                  Document Number
                  <input
                    id="client-doc-num"
                    type="text"
                    placeholder="CPF, CNPJ, Tax ID or VAT ID"
                    value={clientForm.documentNumber}
                    onChange={(e) => setClientForm((c) => ({ ...c, documentNumber: e.target.value }))}
                  />
                </label>
                <label htmlFor="client-phone">
                  Mobile Phone
                  <input
                    id="client-phone"
                    type="text"
                    value={clientForm.phone}
                    onChange={(e) => setClientForm((c) => ({ ...c, phone: e.target.value }))}
                  />
                </label>
                <label htmlFor="client-birth">
                  Birth Date
                  <input
                    id="client-birth"
                    type="date"
                    value={clientForm.birthDate}
                    onChange={(e) => setClientForm((c) => ({ ...c, birthDate: e.target.value }))}
                  />
                </label>
                <label htmlFor="client-address">
                  Summary Address
                  <input
                    id="client-address"
                    type="text"
                    value={clientForm.address}
                    onChange={(e) => setClientForm((c) => ({ ...c, address: e.target.value }))}
                  />
                </label>
              </div>
              <button type="submit" className="btn amz-btn-primary" disabled={clientSubmitting}>
                {clientSubmitting ? 'Saving...' : clientRecord ? 'Update customer profile' : 'Create customer profile'}
              </button>
            </form>
          </div>

          <div className="card">
            <h2>Change password</h2>
            {passMessage && <p className="alert alert-success">{passMessage}</p>}
            {passError && <p className="alert alert-error">{passError}</p>}

            <form onSubmit={handlePasswordSubmit} className="form">
              <label htmlFor="new-password">
                New password
                <input
                  id="new-password"
                  type="password"
                  minLength={8}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                />
              </label>
              <button type="submit" className="btn btn-secondary" disabled={passSubmitting}>
                {passSubmitting ? 'Updating...' : 'Update password'}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'addresses' && (
        <div className="stack">
          {!clientRecord ? (
            <p className="alert alert-info">Create your Customer Profile on the Account tab first to manage addresses.</p>
          ) : (
            <>
              <div className="card">
                <h2>Add International Address (BR / US / EU)</h2>
                {addrFeedback && <p className="alert alert-success">{addrFeedback}</p>}
                {addrError && <p className="alert alert-error">{addrError}</p>}

                <form onSubmit={handleAddressSubmit} className="form">
                  <div className="form-grid-2">
                    <label htmlFor="addr-label">
                      Label
                      <input
                        id="addr-label"
                        type="text"
                        value={addrForm.label}
                        onChange={(e) => setAddrForm((c) => ({ ...c, label: e.target.value }))}
                        required
                      />
                    </label>
                    <label htmlFor="addr-country">
                      Region / Country
                      <select
                        id="addr-country"
                        value={addrForm.country}
                        onChange={(e) => setAddrForm((c) => ({ ...c, country: e.target.value }))}
                      >
                        <option value="BR">Brazil (CEP)</option>
                        <option value="US">United States (ZIP Code)</option>
                        <option value="EU">Europe (Postal Code)</option>
                      </select>
                    </label>
                    <label htmlFor="addr-postal">
                      {addrForm.country === 'BR' ? 'CEP' : addrForm.country === 'US' ? 'ZIP Code' : 'Postal Code'}
                      <div className="actions-row">
                        <input
                          id="addr-postal"
                          type="text"
                          value={addrForm.postalCode}
                          onChange={(e) => setAddrForm((c) => ({ ...c, postalCode: e.target.value }))}
                          required
                        />
                        {addrForm.country === 'BR' && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={cepLoading}
                            onClick={handleViaCepLookup}
                          >
                            {cepLoading ? 'Searching...' : 'ViaCEP'}
                          </button>
                        )}
                      </div>
                    </label>
                    <label htmlFor="addr-recipient">
                      Recipient Name
                      <input
                        id="addr-recipient"
                        type="text"
                        placeholder={clientRecord.fullName}
                        value={addrForm.recipientName}
                        onChange={(e) => setAddrForm((c) => ({ ...c, recipientName: e.target.value }))}
                        required
                      />
                    </label>
                    <label htmlFor="addr-street">
                      Street
                      <input
                        id="addr-street"
                        type="text"
                        value={addrForm.street}
                        onChange={(e) => setAddrForm((c) => ({ ...c, street: e.target.value }))}
                        required
                      />
                    </label>
                    <label htmlFor="addr-number">
                      Number
                      <input
                        id="addr-number"
                        type="text"
                        value={addrForm.number}
                        onChange={(e) => setAddrForm((c) => ({ ...c, number: e.target.value }))}
                        required
                      />
                    </label>
                    <label htmlFor="addr-city">
                      City
                      <input
                        id="addr-city"
                        type="text"
                        value={addrForm.city}
                        onChange={(e) => setAddrForm((c) => ({ ...c, city: e.target.value }))}
                        required
                      />
                    </label>
                    <label htmlFor="addr-state">
                      State / Province
                      <input
                        id="addr-state"
                        type="text"
                        value={addrForm.state}
                        onChange={(e) => setAddrForm((c) => ({ ...c, state: e.target.value }))}
                        required
                      />
                    </label>
                  </div>
                  <button type="submit" className="btn amz-btn-primary">
                    Save address
                  </button>
                </form>
              </div>

              <div className="grid">
                {addresses.map((a) => (
                  <article key={a.addressId} className="card">
                    <div className="actions-row">
                      <strong>{a.label}</strong>
                      <span className="badge">{a.country}</span>
                      {a.isDefaultShipping && <span className="verified-pill">Default</span>}
                    </div>
                    <p>{a.recipientName}</p>
                    <p>{a.street}, {a.number}{a.complement ? ` — ${a.complement}` : ''}</p>
                    <p className="muted">{a.city}, {a.state} • {a.postalCode}</p>
                    <div className="actions-row">
                      {!a.isDefaultShipping && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleSetDefaultAddress(a.addressId)}
                        >
                          Set default
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDeleteAddress(a.addressId)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'wallet' && (
        <div className="stack">
          {!clientRecord ? (
            <p className="alert alert-info">Create your Customer Profile first to access Wallet &amp; Loyalty.</p>
          ) : (
            <>
              <div className="kpi-grid">
                <div className="kpi-card">
                  <span className="muted">Membership Tier</span>
                  <strong>{clientRecord.tier || 'Standard'}</strong>
                </div>
                <div className="kpi-card">
                  <span className="muted">Loyalty Points</span>
                  <strong>{clientRecord.loyaltyPoints ?? 0} pts</strong>
                </div>
                <div className="kpi-card">
                  <span className="muted">Store Credit / Gift Balance</span>
                  <strong>{formatMoney(clientRecord.creditBalance ?? 0)}</strong>
                </div>
              </div>

              <div className="card">
                <h2>Add Payment Method (Simulated Token — Last 4 digits only)</h2>
                {cardFeedback && <p className="alert alert-success">{cardFeedback}</p>}
                {cardError && <p className="alert alert-error">{cardError}</p>}

                <form onSubmit={handleCardSubmit} className="form">
                  <div className="form-grid-2">
                    <label htmlFor="card-brand">
                      Brand / Network
                      <select
                        id="card-brand"
                        value={cardForm.brand}
                        onChange={(e) => setCardForm((c) => ({ ...c, brand: e.target.value }))}
                      >
                        <option value="Visa">Visa</option>
                        <option value="Mastercard">Mastercard</option>
                        <option value="Amex">Amex</option>
                        <option value="Elo">Elo (BR)</option>
                        <option value="PIX">PIX (BR)</option>
                        <option value="SEPA">SEPA (EU)</option>
                      </select>
                    </label>
                    <label htmlFor="card-holder">
                      Cardholder Name
                      <input
                        id="card-holder"
                        type="text"
                        value={cardForm.holderName}
                        onChange={(e) => setCardForm((c) => ({ ...c, holderName: e.target.value }))}
                        required
                      />
                    </label>
                    <label htmlFor="card-last4">
                      Last 4 Digits
                      <input
                        id="card-last4"
                        type="text"
                        maxLength={4}
                        pattern="\d{4}"
                        placeholder="4242"
                        value={cardForm.last4}
                        onChange={(e) => setCardForm((c) => ({ ...c, last4: e.target.value }))}
                        required
                      />
                    </label>
                    <label htmlFor="card-nick">
                      Nickname (optional)
                      <input
                        id="card-nick"
                        type="text"
                        placeholder="Personal Visa"
                        value={cardForm.nickname}
                        onChange={(e) => setCardForm((c) => ({ ...c, nickname: e.target.value }))}
                      />
                    </label>
                  </div>
                  <button type="submit" className="btn amz-btn-primary">
                    Save to wallet
                  </button>
                </form>
              </div>

              <div className="grid">
                {paymentMethods.map((m) => (
                  <article key={m.paymentMethodId} className="card">
                    <div className="actions-row">
                      <strong>{m.brand} •••• {m.last4}</strong>
                      {m.isDefault && <span className="verified-pill">Default</span>}
                    </div>
                    <p className="muted">{m.holderName}{m.nickname ? ` — ${m.nickname}` : ''}</p>
                    <div className="actions-row">
                      {!m.isDefault && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleSetDefaultCard(m.paymentMethodId)}
                        >
                          Set default
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDeleteCard(m.paymentMethodId)}
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileContent />
    </RequireAuth>
  );
}
