const Header = () => {
  return (
    <header
      style={{
        backgroundColor: '#333',
        color: 'white',
        padding: '10px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <h1 style={{ margin: 0 }}>3D Annotation Viewer</h1>
    </header>
  );
};

export default Header;
