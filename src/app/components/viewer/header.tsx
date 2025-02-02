const Header = () => {
    return (
<header style={{ backgroundColor: '#333', color: 'white', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0 }}>3D Annotation Viewer</h1>
          <nav>
            {/*<a href="#contact" style={{ color: 'white' }}>Contact</a>*/}
            {/*<SignIn />*/}
            {/*{user && <span style={{ color: 'white', marginLeft: '20px' }}>logged in</span>}*/}
            </nav>
        </header>
    )
}

export default Header;