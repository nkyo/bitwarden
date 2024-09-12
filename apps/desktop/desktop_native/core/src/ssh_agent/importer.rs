use ssh_key::{HashAlg, LineEnding};

pub fn import_key(
    encoded_key: String,
    password: String,
) -> Result<SshKeyImportResult, anyhow::Error> {
    let private_key = ssh_key::private::PrivateKey::from_openssh(&encoded_key);
    let private_key = match private_key {
        Ok(k) => k,
        Err(_) => {
            return Ok(SshKeyImportResult {
                status: SshKeyImportStatus::ParsingError,
                ssh_key: None,
            });
        }
    };

    if private_key.is_encrypted() && password.is_empty() {
        return Ok(SshKeyImportResult {
            status: SshKeyImportStatus::PasswordRequired,
            ssh_key: None,
        });
    }
    let private_key = if private_key.is_encrypted() {
        match private_key.decrypt(password.as_bytes()) {
            Ok(k) => k,
            Err(_) => {
                return Ok(SshKeyImportResult {
                    status: SshKeyImportStatus::WrongPassword,
                    ssh_key: None,
                });
            }
        }
    } else {
        private_key
    };

    match private_key.to_openssh(LineEnding::LF) {
        Ok(private_key_openssh) => Ok(SshKeyImportResult {
            status: SshKeyImportStatus::Success,
            ssh_key: Some(SshKey {
                private_key: private_key_openssh.to_string(),
                public_key: private_key.public_key().to_string(),
                key_algorithm: private_key.algorithm().to_string(),
                key_fingerprint: private_key.fingerprint(HashAlg::Sha256).to_string(),
            }),
        }),
        Err(_) => Ok(SshKeyImportResult {
            status: SshKeyImportStatus::ParsingError,
            ssh_key: None,
        }),
    }
}

pub enum SshKeyImportStatus {
    /// ssh key was parsed correctly and will be returned in the result
    Success,
    /// ssh key was parsed correctly but is encrypted and requires a password
    PasswordRequired,
    /// ssh key was parsed correctly, and a password was provided when calling the import, but it was incorrect
    WrongPassword,
    /// ssh key could not be parsed, either due to an incorrect / unsupported format (pkcs#8) or key type (ecdsa), or because the input is not an ssh key
    ParsingError,
}

pub struct SshKeyImportResult {
    pub status: SshKeyImportStatus,
    pub ssh_key: Option<SshKey>,
}

pub struct SshKey {
    pub private_key: String,
    pub public_key: String,
    pub key_algorithm: String,
    pub key_fingerprint: String,
}
