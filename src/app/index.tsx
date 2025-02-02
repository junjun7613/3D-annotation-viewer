import { useState } from 'react';
import { useRouter } from 'next/router';

const Home = () => {
  //const [user, loading, error] = useAuthState(auth);
  const [manifestUrl, setManifestUrl] = useState('');
  const router = useRouter();

  const handleManifestUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setManifestUrl(event.target.value);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    router.push(`/viewer?manifestUrl=${encodeURIComponent(manifestUrl)}`);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <h1>Enter IIIF Manifest URL</h1>
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
      >
        <input
          type="text"
          value={manifestUrl}
          onChange={handleManifestUrlChange}
          placeholder="Enter IIIF Manifest URL"
          style={{ width: '300px', padding: '10px', marginBottom: '10px' }}
        />
        <button type="submit" style={{ padding: '10px 20px' }}>
          View
        </button>
      </form>
    </div>
  );
};

export default Home;
