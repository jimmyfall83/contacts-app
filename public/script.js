class ContactDatabase {
    constructor() {
        this.contacts = [];
        this.form = document.getElementById('contactForm');
        this.contactsList = document.getElementById('contactsList');
        this.addContactBtn = document.querySelector('.add-contact-btn');
        this.cancelBtn = document.getElementById('cancelBtn');
        this.contactModal = document.getElementById('contactModal');
        this.deleteModal = document.getElementById('deleteModal');
        this.confirmDelete = document.getElementById('confirmDelete');
        this.cancelDelete = document.getElementById('cancelDelete');
        
        // Event listeners
        this.addContactBtn.addEventListener('click', () => this.showModal());
        this.cancelBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await this.handleCancel();
        });
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.confirmDelete.addEventListener('click', () => {
            this.deleteContact(this.selectedContactId);
            this.hideDeleteModal();  // Hide modal after deletion
        });
        
        this.cancelDelete.addEventListener('click', () => {
            this.hideDeleteModal();  // Hide modal when canceling
        });
        
        // Load contacts
        this.loadContacts();
        
        // Image preview functionality
        this.setupImagePreview();
        
        // Add video preview functionality
        this.setupVideoPreview();
        this.setupYoutubePreview();
        
        // Add attachments functionality
        this.setupAttachments();

        this.attachmentFiles = []; // Add this line to store attachment files

        // Add button references
        this.exportTextBtn = document.querySelector('.export-text-btn');
        this.importTextBtn = document.querySelector('.import-text-btn');
        this.backupBinaryBtn = document.querySelector('.backup-binary-btn');
        this.restoreBinaryBtn = document.querySelector('.restore-binary-btn');
        this.fullBackupBtn = document.querySelector('.full-backup-btn');
        this.fullRestoreBtn = document.querySelector('.full-restore-btn');

        // Add event listeners for import/export and backup/restore
        this.exportTextBtn.addEventListener('click', () => this.exportContacts());
        this.importTextBtn.addEventListener('click', () => this.importContacts());
        this.backupBinaryBtn.addEventListener('click', () => this.backupBinaryData());
        this.restoreBinaryBtn.addEventListener('click', () => this.restoreBinaryData());
        this.fullBackupBtn.addEventListener('click', () => this.fullBackup());
        this.fullRestoreBtn.addEventListener('click', () => this.fullRestore());

        // Add utility button references
        this.compressBackupBtn = document.querySelector('.compress-backup-btn');
        this.verifyBackupBtn = document.querySelector('.verify-backup-btn');
        this.scheduleBackupBtn = document.querySelector('.schedule-backup-btn');
        this.backupSettingsBtn = document.querySelector('.backup-settings-btn');

        // Add utility button event listeners
        this.compressBackupBtn.addEventListener('click', () => this.compressBackup());
        this.verifyBackupBtn.addEventListener('click', () => this.verifyBackup());
        this.scheduleBackupBtn.addEventListener('click', () => this.showScheduleModal());
        this.backupSettingsBtn.addEventListener('click', () => this.showSettingsModal());

        // Add sign out button handler
        this.signOutBtn = document.querySelector('.sign-out-btn');
        this.signOutBtn.addEventListener('click', () => this.handleSignOut());

        // Add form change tracking
        this.formHasChanges = false;
        this.setupFormChangeTracking();

        // Add search functionality
        this.searchInput = document.getElementById('searchInput');
        this.searchInput.addEventListener('input', () => this.handleSearch());
        
        // Store original contacts for search
        this.allContacts = [];

        // Update import button handler
        this.importTextBtn = document.querySelector('.import-text-btn');
        this.importTextBtn.addEventListener('click', () => this.importContacts());

        // Add event listeners for import/export
        this.exportTextBtn = document.querySelector('.export-text-btn');
        this.importTextBtn = document.querySelector('.import-text-btn');
        
        this.exportTextBtn.addEventListener('click', () => this.exportContacts());
        this.importTextBtn.addEventListener('click', () => this.importContacts());

        this.setupTagsInput();
        this.setupCustomFields();
    }

    setupFormChangeTracking() {
        // Track changes on all form inputs
        const inputs = this.form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                this.formHasChanges = true;
            });
            input.addEventListener('input', () => {
                this.formHasChanges = true;
            });
        });
    }

    async handleCancel() {
        if (this.formHasChanges) {
            const shouldDiscard = await this.showUnsavedChangesDialog();
            if (!shouldDiscard) {
                return; // Keep editing
            }
        }
        
        // Reset everything
        this.hideModal();
    }

    showUnsavedChangesDialog() {
        return new Promise((resolve) => {
            const dialog = document.createElement('div');
            dialog.className = 'modal';
            dialog.innerHTML = `
                <div class="modal-content">
                    <h3>Close without saving changes?</h3>
                    <div class="modal-buttons">
                        <button class="discard-btn">Yes, discard changes</button>
                        <button class="keep-editing-btn">No, keep editing</button>
                    </div>
                </div>
            `;

            const discardBtn = dialog.querySelector('.discard-btn');
            const keepEditingBtn = dialog.querySelector('.keep-editing-btn');

            discardBtn.addEventListener('click', () => {
                document.body.removeChild(dialog);
                resolve(true); // User wants to discard changes
            });

            keepEditingBtn.addEventListener('click', () => {
                document.body.removeChild(dialog);
                resolve(false); // User wants to keep editing
            });

            document.body.appendChild(dialog);
        });
    }

    showModal() {
        this.contactModal.classList.remove('hidden');
        this.form.reset(); // Clear form
        
        // Clear all previews
        this.clearAllPreviews();
        
        // Reset attachments array
        this.attachmentFiles = [];
        
        // Get modal content element and reset scroll position
        const modalContent = document.querySelector('.modal-content');
        if (modalContent) {
            modalContent.scrollTo({
                top: 0,
                behavior: 'instant'
            });
        }
        
        // Reset the edit ID if it exists
        delete this.form.dataset.editId;
        // Reset the title and button text
        document.querySelector('.modal-content h2').textContent = 'Add Contact';
        document.querySelector('.save-btn').textContent = 'Save Contact';
        
        // Focus on profile image input instead of salutation
        document.getElementById('image').focus();
    }

    hideModal() {
        this.contactModal.classList.add('hidden');
        this.form.reset();
        // Clear all previews
        this.clearAllPreviews();
        // Reset attachments array
        this.attachmentFiles = [];
        delete this.form.dataset.editId;
        this.formHasChanges = false;
    }

    clearAllPreviews() {
        // Clear image previews
        for (let i = 1; i <= 5; i++) {
            const previewId = i === 1 ? 'imagePreview' : `imagePreview${i}`;
            document.getElementById(previewId).innerHTML = '';
        }
        // Clear other previews
        document.getElementById('videoPreview').innerHTML = '';
        document.getElementById('youtubePreview').innerHTML = '';
        document.getElementById('attachmentsPreview').innerHTML = '';
    }

    setupImagePreview() {
        // Setup preview for all image inputs
        for (let i = 1; i <= 5; i++) {
            const imageInput = document.getElementById(i === 1 ? 'image' : `image${i}`);
            const imagePreview = document.getElementById(i === 1 ? 'imagePreview' : `imagePreview${i}`);

            // Add click handler for full-size preview
            imagePreview.addEventListener('click', (e) => {
                const img = e.target;
                if (img.tagName === 'IMG') {
                    this.showFullSizeImage(img.src);
                }
            });

            imageInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    if (!file.type.startsWith('image/')) {
                        alert('Please select an image file');
                        return;
                    }
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const img = new Image();
                        img.src = e.target.result;
                        imagePreview.innerHTML = '';
                        imagePreview.appendChild(img);
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
    }

    showFullSizeImage(src) {
        const modal = document.createElement('div');
        modal.className = 'image-preview-modal';
        modal.innerHTML = `<img src="${src}" alt="Full size preview">`;
        
        // Close on click
        modal.addEventListener('click', () => {
            modal.remove();
        });
        
        // Add keyboard support for closing
        document.addEventListener('keydown', function closeOnEscape(e) {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', closeOnEscape);
            }
        });
        
        document.body.appendChild(modal);
    }

    setupVideoPreview() {
        const videoInput = document.getElementById('video');
        const videoPreview = document.getElementById('videoPreview');
        
        videoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                if (!file.type.startsWith('video/')) {
                    alert('Please select a video file');
                    return;
                }
                
                const video = document.createElement('video');
                video.controls = true;
                video.setAttribute('playsinline', '');  // iOS support - safer way
                video.setAttribute('webkit-playsinline', '');  // Older iOS - safer way
                video.style.maxWidth = '100%';  // Responsive but safe
                video.src = URL.createObjectURL(file);
                videoPreview.innerHTML = '';
                videoPreview.appendChild(video);
            }
        });
    }

    setupYoutubePreview() {
        const youtubeInput = document.getElementById('youtubeUrl');
        const youtubePreview = document.getElementById('youtubePreview');
        
        youtubeInput.addEventListener('input', (e) => {
            const url = e.target.value.trim();
            if (url && this.isValidYoutubeUrl(url)) {
                const videoId = this.getYoutubeVideoId(url);
                if (videoId) {
                    youtubePreview.innerHTML = `
                        <div class="youtube-container" id="youtube-${videoId}">
                            <div class="youtube-thumbnail">
                                <img src="https://img.youtube.com/vi/${videoId}/maxresdefault.jpg" 
                                     onerror="this.src='https://img.youtube.com/vi/${videoId}/0.jpg'"
                                     alt="Video thumbnail">
                            </div>
                            <div class="youtube-overlay">
                                <button class="youtube-open-btn" onclick="event.preventDefault(); playVideo(this, '${videoId}')">
                                    <span class="material-icons">play_arrow</span>
                                    Play Video
                                </button>
                            </div>
                        </div>
                    `;
                }
            } else {
                youtubePreview.innerHTML = '';
            }
        });
    }

    isValidYoutubeUrl(url) {
        return url.match(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/);
    }

    getYoutubeVideoId(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    async loadContacts() {
        try {
            const response = await fetch('http://localhost:3001/contacts');
            this.contacts = await response.json();
            this.allContacts = [...this.contacts]; // Store copy of all contacts
            this.displayContacts();
        } catch (error) {
            console.error('Error loading contacts:', error);
        }
    }

    async deleteContact(id) {
        try {
            await fetch(`http://localhost:3001/contacts/${id}`, {
                method: 'DELETE'
            });
            this.contacts = this.contacts.filter(contact => contact.id !== id);
            this.displayContacts();
            this.hideDeleteModal();  // Hide modal after successful deletion
        } catch (error) {
            console.error('Error deleting contact:', error);
            alert('Error deleting contact: ' + error.message);
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        const editId = this.form.dataset.editId;
        const formData = new FormData();
        
        // Add basic form fields
        formData.append('salutation', document.getElementById('salutation').value);
        formData.append('firstName', document.getElementById('firstName').value);
        formData.append('lastName', document.getElementById('lastName').value);
        formData.append('jobTitle', document.getElementById('jobTitle').value);
        formData.append('company', document.getElementById('company').value);
        formData.append('email', document.getElementById('email').value);
        formData.append('workPhone', document.getElementById('workPhone').value);
        formData.append('homePhone', document.getElementById('homePhone').value);
        formData.append('mobilePhone', document.getElementById('mobilePhone').value);
        formData.append('address1', document.getElementById('address1').value);
        formData.append('address2', document.getElementById('address2').value);
        formData.append('city', document.getElementById('city').value);
        formData.append('state', document.getElementById('state').value);
        formData.append('zipCode', document.getElementById('zipCode').value);
        formData.append('country', document.getElementById('country').value);
        formData.append('webPage', document.getElementById('webPage').value);
        formData.append('group', document.getElementById('group').value);
        formData.append('notes', document.getElementById('notes').value);

        // Add all images if selected
        for (let i = 1; i <= 5; i++) {
            const imageFile = document.getElementById(i === 1 ? 'image' : `image${i}`).files[0];
            if (imageFile) {
                formData.append(i === 1 ? 'image' : `image${i}`, imageFile);
            }
        }

        // Add video if selected
        const videoFile = document.getElementById('video').files[0];
        if (videoFile) {
            formData.append('video', videoFile);
        }
        
        // Add YouTube URL
        formData.append('youtubeUrl', document.getElementById('youtubeUrl').value);

        // Add attachments if any - simplified approach
        if (this.attachmentFiles && this.attachmentFiles.length > 0) {
            // Add each file with the same field name 'attachment'
            this.attachmentFiles.forEach(file => {
                formData.append('attachment', file);
            });
        }

        try {
            const url = editId ? 
                `http://localhost:3001/contacts/${editId}` : 
                'http://localhost:3001/contacts';
            
            const method = editId ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                body: formData
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Server response:', errorText); // Log the actual server error
                throw new Error(errorText);
            }

            const contact = await response.json();
            if (editId) {
                const index = this.contacts.findIndex(c => c.id === parseInt(editId));
                if (index !== -1) {
                    this.contacts[index] = contact;
                }
            } else {
                this.contacts.push(contact);
            }
            
            this.displayContacts();
            this.hideModal();
        } catch (error) {
            console.error('Error saving contact:', error);
            alert(`Error saving contact: ${error.message}`); // Show more detailed error
        }
    }

    displayContacts() {
        this.contactsList.innerHTML = '';
        
        this.contacts.forEach(contact => {
            const contactCard = document.createElement('div');
            contactCard.className = 'contact-card';
            
            const fullName = `${contact.salutation || ''} ${contact.firstName} ${contact.lastName}`.trim();
            const jobInfo = contact.jobTitle && contact.company ? 
                `${contact.jobTitle} at ${contact.company}` : 
                (contact.jobTitle || contact.company || '');
            
            contactCard.innerHTML = `
                <div class="contact-info">
                    ${contact.image 
                        ? `<img src="data:image/jpeg;base64,${
                            this.getImageData(contact.image)
                          }" alt="${fullName}" class="profile-image">`
                        : `<span class="profile-image no-image">
                             <span class="material-icons">person</span>
                           </span>`
                    }
                    <div class="contact-details">
                        <h2 class="contact-name">${fullName}</h2>
                        <p class="contact-title">${jobInfo}</p>
                        <p class="contact-email">${contact.email || ''}</p>
                    </div>
                </div>
                <button class="delete-btn">
                    <span class="material-icons">delete</span>
                    Delete Contact
                </button>
            `;
            
            // Make the entire card clickable for editing
            contactCard.addEventListener('click', (e) => {
                // Don't trigger edit if clicking delete button
                if (!e.target.closest('.delete-btn')) {
                    this.showEditModal(contact);
                }
            });
            
            const deleteBtn = contactCard.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent edit modal from opening
                this.showDeleteModal(contact.id);
            });
            
            this.contactsList.appendChild(contactCard);
        });

        // If there's a search term, highlight the matches
        const searchTerm = this.searchInput.value.toLowerCase().trim();
        if (searchTerm) {
            const highlightText = (text) => {
                if (!text) return '';
                const regex = new RegExp(`(${searchTerm})`, 'gi');
                return text.replace(regex, '<span class="search-highlight">$1</span>');
            };

            // Highlight matching text in contact cards
            document.querySelectorAll('.contact-name').forEach(element => {
                element.innerHTML = highlightText(element.textContent);
            });
            document.querySelectorAll('.contact-title').forEach(element => {
                element.innerHTML = highlightText(element.textContent);
            });
            document.querySelectorAll('.contact-email').forEach(element => {
                element.innerHTML = highlightText(element.textContent);
            });
        }
    }

    showEditModal(contact) {
        console.log('Contact data received:', {
            id: contact.id,
            hasImage: !!contact.image,
            hasImage2: !!contact.image2,
            hasImage3: !!contact.image3,
            hasImage4: !!contact.image4,
            hasImage5: !!contact.image5
        });

        // Show modal
        this.contactModal.classList.remove('hidden');
        
        // Get modal content element
        const modalContent = document.querySelector('.modal-content');
        
        // Reset scroll position
        if (modalContent) {
            modalContent.scrollTo({
                top: 0,
                behavior: 'instant'
            });
        }
        
        document.querySelector('.modal-content h2').textContent = 'Edit Contact';
        
        // Fill the form with contact data
        document.getElementById('salutation').value = contact.salutation || '';
        document.getElementById('firstName').value = contact.firstName || '';
        document.getElementById('lastName').value = contact.lastName || '';
        document.getElementById('jobTitle').value = contact.jobTitle || '';
        document.getElementById('company').value = contact.company || '';
        document.getElementById('email').value = contact.email || '';
        document.getElementById('workPhone').value = contact.workPhone || '';
        document.getElementById('homePhone').value = contact.homePhone || '';
        document.getElementById('mobilePhone').value = contact.mobilePhone || '';
        document.getElementById('address1').value = contact.address1 || '';
        document.getElementById('address2').value = contact.address2 || '';
        document.getElementById('city').value = contact.city || '';
        document.getElementById('state').value = contact.state || '';
        document.getElementById('zipCode').value = contact.zipCode || '';
        document.getElementById('country').value = contact.country || '';
        document.getElementById('webPage').value = contact.webPage || '';
        document.getElementById('group').value = contact.group_name || '';
        document.getElementById('notes').value = contact.notes || '';
        
        // Show main image
        if (contact.image) {
            document.getElementById('imagePreview').innerHTML = 
                `<img src="data:image/jpeg;base64,${this.getImageData(contact.image)}" 
                     alt="${contact.firstName} ${contact.lastName}">`;
        }

        // Show additional images
        const additionalImages = ['image2', 'image3', 'image4', 'image5'];
        additionalImages.forEach((imageKey, i) => {
            if (contact[imageKey]) {
                const imageData = this.getImageData(contact[imageKey]);
                document.getElementById(`imagePreview${i + 2}`).innerHTML = 
                    `<img src="data:image/jpeg;base64,${imageData}" alt="Additional image ${i + 2}">`;
            }
        });
        
        // Store the contact ID for updating
        this.form.dataset.editId = contact.id;
        
        // Update submit button text
        document.querySelector('.save-btn').textContent = 'Save Changes';
        
        // Add video preview if exists
        if (contact.video) {
            const videoData = this.getVideoData(contact.video);
            const video = document.createElement('video');
            video.controls = true;
            video.setAttribute('playsinline', '');  // iOS support - safer way
            video.setAttribute('webkit-playsinline', '');  // Older iOS - safer way
            video.style.maxWidth = '100%';  // Responsive but safe
            video.src = `data:video/mp4;base64,${videoData}`;
            document.getElementById('videoPreview').innerHTML = '';
            document.getElementById('videoPreview').appendChild(video);
        }
        
        // Add YouTube preview if exists
        if (contact.youtubeUrl) {
            document.getElementById('youtubeUrl').value = contact.youtubeUrl;
            const videoId = this.getYoutubeVideoId(contact.youtubeUrl);
            if (videoId) {
                document.getElementById('youtubePreview').innerHTML = `
                    <div class="youtube-container" id="youtube-${videoId}">
                        <div class="youtube-thumbnail">
                            <img src="https://img.youtube.com/vi/${videoId}/maxresdefault.jpg" 
                                 onerror="this.src='https://img.youtube.com/vi/${videoId}/0.jpg'"
                                 alt="Video thumbnail">
                        </div>
                        <div class="youtube-overlay">
                            <button class="youtube-open-btn" onclick="event.preventDefault(); playVideo(this, '${videoId}')">
                                <span class="material-icons">play_arrow</span>
                                Play Video
                            </button>
                        </div>
                    </div>
                `;
            }
        }

        // Show existing attachments if any
        if (contact.attachments) {
            try {
                const attachments = JSON.parse(contact.attachments);
                attachments.forEach(attachment => {
                    const item = document.createElement('div');
                    item.className = 'attachment-item';
                    
                    const ext = attachment.name.split('.').pop().toLowerCase();
                    const icon = this.getFileIcon(attachment.name);
                    
                    item.innerHTML = `
                        <span class="material-icons" data-type="${ext}">${icon}</span>
                        <a href="#" class="attachment-name" data-attachment='${JSON.stringify(attachment)}'>${attachment.name}</a>
                        <span class="material-icons remove-attachment" data-name="${attachment.name}">close</span>
                    `;
                    
                    // Add click handler for the attachment name
                    const attachmentLink = item.querySelector('.attachment-name');
                    attachmentLink.addEventListener('click', (e) => {
                        e.preventDefault();
                        const attachmentData = JSON.parse(e.target.dataset.attachment);
                        this.openAttachment(attachmentData);
                    });
                    
                    item.querySelector('.remove-attachment').addEventListener('click', () => {
                        this.attachmentFiles = this.attachmentFiles.filter(f => f.name !== attachment.name);
                        item.remove();
                    });
                    
                    document.getElementById('attachmentsPreview').appendChild(item);
                    
                    // Convert base64 to File object
                    const byteString = atob(attachment.data);
                    const ab = new ArrayBuffer(byteString.length);
                    const ia = new Uint8Array(ab);
                    for (let i = 0; i < byteString.length; i++) {
                        ia[i] = byteString.charCodeAt(i);
                    }
                    const blob = new Blob([ab], { type: attachment.type });
                    const file = new File([blob], attachment.name, { type: attachment.type });
                    this.attachmentFiles.push(file);
                });
            } catch (error) {
                console.error('Error loading attachments:', error);
            }
        }

        // After showing images, add custom button styling
        for (let i = 1; i <= 5; i++) {
            const imageKey = i === 1 ? 'image' : `image${i}`;
            const imageInput = document.getElementById(imageKey);
            const imagePreview = document.getElementById(`imagePreview${i === 1 ? '' : i}`);
            
            // Remove any existing image-input-wrapper
            const existingWrapper = imageInput.closest('.image-input-wrapper');
            if (existingWrapper) {
                existingWrapper.parentNode.insertBefore(imageInput, existingWrapper);
                existingWrapper.remove();
            }
            
            // Create custom button wrapper
            const wrapper = document.createElement('div');
            wrapper.className = 'image-input-wrapper';
            wrapper.innerHTML = `
                <label class="change-image-btn" for="${imageKey}">
                    ${contact[imageKey] ? 'Change Picture' : 'Browse...'}
                </label>
                ${!contact[imageKey] ? '<span class="file-name">No file selected</span>' : ''}
            `;
            
            // Replace the default input with our custom one
            imageInput.parentNode.insertBefore(wrapper, imageInput);
            wrapper.appendChild(imageInput);
        }

        // Focus on profile image input instead of salutation
        document.getElementById('image').focus();

        if (contact.tags) {
            this.loadTags(contact.tags);
        }

        if (contact.customFields) {
            this.loadCustomFields(contact.customFields);
        }
    }

    showDeleteModal(id) {
        this.selectedContactId = id;  // Store the ID of contact to delete
        this.deleteModal.classList.remove('hidden');
    }

    hideDeleteModal() {
        this.deleteModal.classList.add('hidden');
        this.selectedContactId = null;  // Clear the stored ID
    }

    setupAttachments() {
        const attachmentsInput = document.getElementById('attachments');
        const attachmentsPreview = document.getElementById('attachmentsPreview');
        const maxFiles = 10;
        
        attachmentsInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            
            if (this.attachmentFiles.length + files.length > maxFiles) {
                alert(`You can only upload up to ${maxFiles} files. Please remove some files first.`);
                return;
            }

            files.forEach(file => {
                this.attachmentFiles.push(file);
                const item = document.createElement('div');
                item.className = 'attachment-item';
                
                const ext = file.name.split('.').pop().toLowerCase();
                const icon = this.getFileIcon(file.name);
                
                item.innerHTML = `
                    <span class="material-icons" data-type="${ext}">${icon}</span>
                    <span class="attachment-name">${file.name}</span>
                    <span class="attachment-size">${this.formatFileSize(file.size)}</span>
                    <span class="material-icons remove-attachment" data-name="${file.name}">close</span>
                `;
                
                item.querySelector('.remove-attachment').addEventListener('click', () => {
                    this.attachmentFiles = this.attachmentFiles.filter(f => f.name !== file.name);
                    item.remove();
                });
                
                attachmentsPreview.appendChild(item);
            });
        });
    }

    getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        switch (ext) {
            case 'pdf': return 'picture_as_pdf';
            case 'doc':
            case 'docx': return 'description';
            case 'xls':
            case 'xlsx': return 'table_chart';
            case 'ppt':
            case 'pptx': return 'slideshow';
            case 'txt':
            case 'rtf': return 'text_snippet';
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif':
            case 'bmp':
            case 'tiff': return 'image';
            case 'zip':
            case 'rar':
            case '7z': return 'folder_zip';
            default: return 'insert_drive_file';
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async exportContacts() {
        // Create a single modal container if it doesn't exist
        let modalContainer = document.querySelector('.export-modal-container');
        if (!modalContainer) {
            modalContainer = document.createElement('div');
            modalContainer.className = 'modal export-modal-container';
            document.body.appendChild(modalContainer);
        }

        modalContainer.innerHTML = `
            <div class="modal-content" onclick="event.stopPropagation()">
                <h3>Choose Export Format</h3>
                <div class="format-buttons">
                    <button class="json-btn">
                        <span class="material-icons">data_object</span>
                        JSON Format
                        <small>Includes all data including images</small>
                    </button>
                    <button class="csv-btn">
                        <span class="material-icons">grid_on</span>
                        CSV Format
                        <small>Spreadsheet-friendly, no images</small>
                    </button>
                </div>
                <button class="cancel-btn">Cancel</button>
            </div>
        `;

        // Add button handlers
        modalContainer.querySelector('.json-btn').addEventListener('click', () => {
            this.exportAsFormat('json');
            modalContainer.remove();
        });
        
        modalContainer.querySelector('.csv-btn').addEventListener('click', () => {
            this.exportAsFormat('csv');
            modalContainer.remove();
        });
        
        modalContainer.querySelector('.cancel-btn').addEventListener('click', () => {
            modalContainer.remove();
        });

        // Close on background click
        modalContainer.addEventListener('click', (e) => {
            if (e.target === modalContainer) {
                modalContainer.remove();
            }
        });
    }

    async importContacts() {
        // Create a single modal container if it doesn't exist
        let modalContainer = document.querySelector('.import-modal-container');
        if (!modalContainer) {
            modalContainer = document.createElement('div');
            modalContainer.className = 'modal import-modal-container';
            document.body.appendChild(modalContainer);
        }

        modalContainer.innerHTML = `
            <div class="modal-content" onclick="event.stopPropagation()">
                <h3>Choose Import Format</h3>
                <div class="format-buttons">
                    <button class="json-btn">
                        <span class="material-icons">data_object</span>
                        JSON Format
                        <small>Full backup with images and attachments</small>
                    </button>
                    <button class="csv-btn">
                        <span class="material-icons">grid_on</span>
                        CSV Format
                        <small>Basic contact information only</small>
                    </button>
                </div>
                <button class="cancel-btn">Cancel</button>
            </div>
        `;

        // Create hidden file inputs
        const jsonInput = document.createElement('input');
        jsonInput.type = 'file';
        jsonInput.accept = '.json';
        jsonInput.style.display = 'none';
        document.body.appendChild(jsonInput);

        const csvInput = document.createElement('input');
        csvInput.type = 'file';
        csvInput.accept = '.csv';
        csvInput.style.display = 'none';
        document.body.appendChild(csvInput);

        const cleanup = () => {
            modalContainer.remove();
            jsonInput.remove();
            csvInput.remove();
        };

        // Add file input handlers
        jsonInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    const text = await file.text();
                    const contacts = JSON.parse(text);
                    await this.importContactsData(contacts, 'json');
                    cleanup();
                } catch (error) {
                    console.error('Import error:', error);
                    alert('Error importing contacts: ' + error.message);
                }
            }
        };

        csvInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    const text = await file.text();
                    const contacts = this.parseCSV(text);
                    await this.importContactsData(contacts, 'csv');
                    cleanup();
                } catch (error) {
                    console.error('Import error:', error);
                    alert('Error importing contacts: ' + error.message);
                }
            }
        };

        // Add button handlers
        modalContainer.querySelector('.json-btn').addEventListener('click', () => {
            jsonInput.click();
        });
        
        modalContainer.querySelector('.csv-btn').addEventListener('click', () => {
            csvInput.click();
        });
        
        modalContainer.querySelector('.cancel-btn').addEventListener('click', cleanup);

        // Close on background click
        modalContainer.addEventListener('click', (e) => {
            if (e.target === modalContainer) {
                cleanup();
            }
        });
    }

    // Add this helper method to handle the import
    async importContactsData(contacts, format) {
        try {
            const response = await fetch('http://localhost:3001/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(contacts)
            });

            if (!response.ok) throw new Error('Import failed');

            await this.loadContacts();
            alert('Contacts imported successfully!');
        } catch (error) {
            console.error('Import error:', error);
            alert('Error importing contacts: ' + error.message);
        }
    }

    async backupBinaryData() {
        try {
            console.log('Starting backup...');
            const response = await fetch('http://localhost:3001/export/binary');
            const text = await response.text();
            console.log('Response:', text);
            
            if (!response.ok) {
                throw new Error(`Backup failed: ${text}`);
            }
            
            const result = JSON.parse(text);
            alert(`Backup completed successfully!\nSaved to: ${result.backupPath}`);
        } catch (error) {
            console.error('Backup error:', error);
            alert('Error creating backup: ' + error.message);
        }
    }

    async restoreBinaryData() {
        try {
            // Get list of available backups (you might want to add an endpoint for this)
            const timestamp = prompt('Enter backup timestamp (YYYY-MM-DDTHH-mm-ss-SSSZ format):');
            if (!timestamp) return;

            const response = await fetch(`http://localhost:3001/import/binary/${timestamp}`, {
                method: 'POST'
            });
            
            if (!response.ok) throw new Error('Restore failed');
            
            const result = await response.json();
            alert('Restore completed successfully!');
            
            // Refresh the contact list
            await this.loadContacts();
        } catch (error) {
            console.error('Restore error:', error);
            alert('Error restoring backup: ' + error.message);
        }
    }

    async fullBackup() {
        try {
            // Step 1: Export text data
            const response = await fetch('http://localhost:3001/export');
            if (!response.ok) throw new Error('Text export failed');
            const contacts = await response.json();
            
            // Step 2: Create binary backup
            const binaryResponse = await fetch('http://localhost:3001/export/binary');
            if (!binaryResponse.ok) throw new Error('Binary backup failed');
            const binaryResult = await binaryResponse.json();
            
            // Step 3: Save combined backup
            const fullBackup = {
                timestamp: new Date().toISOString(),
                textData: contacts,
                binaryPath: binaryResult.backupPath
            };
            
            // Create and download the full backup file
            const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `contacts_full_backup_${fullBackup.timestamp.split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            
            // Cleanup
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            alert('Full backup completed successfully!\nText data and files have been backed up.');
        } catch (error) {
            console.error('Full backup error:', error);
            alert('Error creating full backup: ' + error.message);
        }
    }

    async fullRestore() {
        try {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                try {
                    // Read and parse the full backup file
                    const text = await file.text();
                    const fullBackup = JSON.parse(text);
                    
                    // Clean and validate the backup data
                    const cleanedContacts = fullBackup.textData.map(contact => {
                        // Create a clean contact object with only valid fields
                        const cleanContact = {
                            id: contact.id, // Preserve original ID to maintain relationships
                            salutation: contact.salutation || '',
                            firstName: contact.firstName || '',
                            lastName: contact.lastName || '',
                            jobTitle: contact.jobTitle || '',
                            company: contact.company || '',
                            email: contact.email || '',
                            workPhone: contact.workPhone || '',
                            homePhone: contact.homePhone || '',
                            mobilePhone: contact.mobilePhone || '',
                            address1: contact.address1 || '',
                            address2: contact.address2 || '',
                            city: contact.city || '',
                            state: contact.state || '',
                            zipCode: contact.zipCode || '',
                            country: contact.country || '',
                            webPage: contact.webPage || '',
                            group_name: contact.group_name || '',
                            notes: contact.notes || '',
                            youtubeUrl: contact.youtubeUrl || ''
                        };

                        // Only copy media if it belongs to this contact
                        if (contact.image) cleanContact.image = contact.image;
                        if (contact.video) cleanContact.video = contact.video;
                        if (contact.attachments) cleanContact.attachments = contact.attachments;

                        // Handle additional images
                        for (let i = 2; i <= 5; i++) {
                            const imageKey = `image${i}`;
                            if (contact[imageKey]) {
                                cleanContact[imageKey] = contact[imageKey];
                            }
                        }

                        return cleanContact;
                    });

                    // First, clear existing contacts
                    await fetch('http://localhost:3001/contacts/clear', {
                        method: 'POST'
                    });

                    // Then restore cleaned contacts
                    const importResponse = await fetch('http://localhost:3001/import', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(cleanedContacts)
                    });
                    
                    if (!importResponse.ok) throw new Error('Text import failed');
                    
                    // Refresh the contact list
                    await this.loadContacts();
                    
                    alert('Full restore completed successfully!');
                } catch (error) {
                    console.error('Full restore error:', error);
                    alert('Error restoring backup: ' + error.message);
                }
            };
            
            input.click();
        } catch (error) {
            console.error('Full restore error:', error);
            alert('Error initiating restore: ' + error.message);
        }
    }

    async compressBackup() {
        try {
            const response = await fetch('http://localhost:3001/backup/compress');
            if (!response.ok) throw new Error('Compression failed');
            
            const result = await response.json();
            alert(`Backup compressed successfully!\nCompressed size: ${result.compressedSize}\nCompression ratio: ${result.compressionRatio}`);
        } catch (error) {
            console.error('Compression error:', error);
            alert('Error compressing backup: ' + error.message);
        }
    }

    async verifyBackup() {
        try {
            const response = await fetch('http://localhost:3001/backup/verify');
            if (!response.ok) throw new Error('Verification failed');
            
            const result = await response.json();
            if (result.isValid) {
                alert('Backup verification successful!\nAll files are intact and valid.');
            } else {
                alert('Backup verification failed!\nIssues found: ' + result.issues.join('\n'));
            }
        } catch (error) {
            console.error('Verification error:', error);
            alert('Error verifying backup: ' + error.message);
        }
    }

    showScheduleModal() {
        // Create and show schedule modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Schedule Backup</h2>
                <form id="scheduleForm">
                    <div class="form-group">
                        <label>Frequency</label>
                        <select id="backupFrequency">
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Time</label>
                        <input type="time" id="backupTime" required>
                    </div>
                    <div class="form-buttons">
                        <button type="submit" class="save-btn">Save Schedule</button>
                        <button type="button" class="cancel-btn" onclick="this.closest('.modal').remove()">Cancel</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        // Handle form submission
        document.getElementById('scheduleForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const frequency = document.getElementById('backupFrequency').value;
            const time = document.getElementById('backupTime').value;
            
            try {
                const response = await fetch('http://localhost:3001/backup/schedule', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ frequency, time })
                });
                
                if (!response.ok) throw new Error('Failed to save schedule');
                
                alert('Backup schedule saved successfully!');
                modal.remove();
            } catch (error) {
                console.error('Schedule error:', error);
                alert('Error saving schedule: ' + error.message);
            }
        });
    }

    showSettingsModal() {
        // Create and show settings modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Backup Settings</h2>
                <form id="settingsForm">
                    <div class="form-group">
                        <label>Compression Level</label>
                        <select id="compressionLevel">
                            <option value="none">None</option>
                            <option value="fast">Fast</option>
                            <option value="balanced">Balanced</option>
                            <option value="max">Maximum</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Keep Backups For</label>
                        <select id="retentionPeriod">
                            <option value="7">7 days</option>
                            <option value="30">30 days</option>
                            <option value="90">90 days</option>
                            <option value="365">1 year</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="encryptBackups">
                            Encrypt Backups
                        </label>
                    </div>
                    <div class="form-buttons">
                        <button type="submit" class="save-btn">Save Settings</button>
                        <button type="button" class="cancel-btn" onclick="this.closest('.modal').remove()">Cancel</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        // Handle form submission
        document.getElementById('settingsForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const settings = {
                compressionLevel: document.getElementById('compressionLevel').value,
                retentionPeriod: document.getElementById('retentionPeriod').value,
                encryptBackups: document.getElementById('encryptBackups').checked
            };
            
            try {
                const response = await fetch('http://localhost:3001/backup/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(settings)
                });
                
                if (!response.ok) throw new Error('Failed to save settings');
                
                alert('Backup settings saved successfully!');
                modal.remove();
            } catch (error) {
                console.error('Settings error:', error);
                alert('Error saving settings: ' + error.message);
            }
        });
    }

    async handleSignOut() {
        alert('Sign out functionality will be added with authentication in a future update.');
        // Keeping the code commented for future implementation
        /*
        try {
            // Clear any stored data
            localStorage.clear();
            sessionStorage.clear();
            
            // Redirect to login page
            window.location.href = '/login.html';
        } catch (error) {
            console.error('Sign out error:', error);
            alert('Error signing out: ' + error.message);
        }
        */
    }

    // Add new method to handle opening attachments
    openAttachment(attachment) {
        // Create blob from base64 data
        const byteString = atob(attachment.data);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: attachment.type });
        
        // Create object URL
        const url = URL.createObjectURL(blob);
        
        // Create a link element
        const a = document.createElement('a');
        a.href = url;
        a.download = attachment.name; // Set the original filename
        
        // Trigger download
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Clean up the URL after a delay
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    handleSearch() {
        const searchTerm = this.searchInput.value.toLowerCase().trim();
        
        if (!searchTerm) {
            this.contacts = [...this.allContacts];
            this.displayContacts();
            return;
        }

        this.contacts = this.allContacts.filter(contact => {
            // Search through all relevant fields
            const searchableFields = [
                contact.salutation,
                contact.firstName,
                contact.lastName,
                contact.jobTitle,
                contact.company,
                contact.email,
                contact.workPhone,
                contact.homePhone,
                contact.mobilePhone,
                contact.address1,
                contact.address2,
                contact.city,
                contact.state,
                contact.zipCode,
                contact.country,
                contact.webPage,
                contact.group,
                contact.notes
            ];

            // Return true if any field contains the search term
            return searchableFields.some(field => 
                field && field.toLowerCase().includes(searchTerm)
            );
        });

        this.displayContacts();
    }

    async exportAsFormat(format) {
        try {
            const response = await fetch('http://localhost:3001/contacts');
            if (!response.ok) throw new Error('Export failed');
            const contacts = await response.json();

            if (format === 'json') {
                // Export as JSON (with all data)
                const blob = new Blob([JSON.stringify(contacts, null, 2)], { type: 'application/json' });
                this.downloadFile(blob, `contacts_${new Date().toISOString().split('T')[0]}.json`);
            } else if (format === 'csv') {
                // Define CSV headers
                const headers = [
                    'ID', 'Salutation', 'First Name', 'Last Name', 'Job Title', 'Company',
                    'Email', 'Work Phone', 'Home Phone', 'Mobile Phone',
                    'Address 1', 'Address 2', 'City', 'State', 'Zip Code', 'Country',
                    'Web Page', 'Group', 'Notes', 'YouTube URL',
                    'Profile Image File', 'Image 2 File', 'Image 3 File', 'Image 4 File', 'Image 5 File',
                    'Video File', 'Attachment Files'
                ];

                // Convert contacts to CSV rows
                const csvRows = [headers];
                contacts.forEach(contact => {
                    csvRows.push([
                        contact.id || '',
                        contact.salutation || '',
                        contact.firstName || '',
                        contact.lastName || '',
                        contact.jobTitle || '',
                        contact.company || '',
                        contact.email || '',
                        contact.workPhone || '',
                        contact.homePhone || '',
                        contact.mobilePhone || '',
                        contact.address1 || '',
                        contact.address2 || '',
                        contact.city || '',
                        contact.state || '',
                        contact.zipCode || '',
                        contact.country || '',
                        contact.webPage || '',
                        contact.group_name || '',
                        contact.notes || '',
                        contact.youtubeUrl || '',
                        this.getFilename(contact.image),
                        this.getFilename(contact.image2),
                        this.getFilename(contact.image3),
                        this.getFilename(contact.image4),
                        this.getFilename(contact.image5),
                        this.getFilename(contact.video),
                        contact.attachments ? JSON.parse(contact.attachments).map(a => a.name).join('; ') : ''
                    ]);
                });

                // Convert to CSV string
                const csvContent = csvRows.map(row => 
                    row.map(cell => 
                        `"${String(cell || '').replace(/"/g, '""')}"`
                    ).join(',')
                ).join('\n');

                const blob = new Blob([csvContent], { type: 'text/csv' });
                this.downloadFile(blob, `contacts_${new Date().toISOString().split('T')[0]}.csv`);
            }
        } catch (error) {
            console.error('Export error:', error);
            alert('Error exporting contacts: ' + error.message);
        }
    }

    downloadFile(blob, filename) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }

    parseCSV(text) {
        // Split into rows and remove any empty rows
        const rows = text.split('\n').filter(row => row.trim());
        
        // Parse headers (first row)
        const headers = this.parseCSVRow(rows[0]);
        
        // Convert header names to match database fields
        const fieldMap = {
            'Salutation': 'salutation',
            'First Name': 'firstName',
            'Last Name': 'lastName',
            'Job Title': 'jobTitle',
            'Company': 'company',
            'Email': 'email',
            'Work Phone': 'workPhone',
            'Home Phone': 'homePhone',
            'Mobile Phone': 'mobilePhone',
            'Address 1': 'address1',
            'Address 2': 'address2',
            'City': 'city',
            'State': 'state',
            'Zip Code': 'zipCode',
            'Country': 'country',
            'Web Page': 'webPage',
            'Group': 'group_name',
            'Notes': 'notes',
            'YouTube URL': 'youtubeUrl'
        };

        // Parse data rows
        return rows.slice(1).map(row => {
            const values = this.parseCSVRow(row);
            const contact = {};
            
            headers.forEach((header, index) => {
                const fieldName = fieldMap[header] || header;
                contact[fieldName] = values[index] || '';
            });

            return contact;
        });
    }

    parseCSVRow(row) {
        const values = [];
        let inQuotes = false;
        let currentValue = '';
        
        for (let i = 0; i < row.length; i++) {
            const char = row[i];
            
            if (char === '"') {
                if (inQuotes && row[i + 1] === '"') {
                    currentValue += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                values.push(currentValue.trim());
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        
        values.push(currentValue.trim());
        return values;
    }

    getFilename(field) {
        if (!field) return '';
        try {
            const parsed = JSON.parse(field);
            return parsed.filename || '';
        } catch (e) {
            return ''; // Just return empty string instead of 'Legacy file'
        }
    }

    getImageData(imageField) {
        if (!imageField) return '';
        try {
            const parsed = JSON.parse(imageField);
            return parsed.data;
        } catch {
            return ''; // Just return empty string instead of the raw base64
        }
    }

    getVideoData(videoField) {
        if (!videoField) return '';
        try {
            const parsed = JSON.parse(videoField);
            return parsed.data;
        } catch {
            return ''; // Return empty string for invalid data
        }
    }

    setupTagsInput() {
        const tagInput = document.getElementById('tagInput');
        const tagsList = document.getElementById('tagsList');
        const tagsHidden = document.getElementById('tags');
        let tags = [];

        // Function to update tags
        const updateTags = () => {
            tagsList.innerHTML = tags.map(tag => `
                <span class="tag">
                    ${tag}
                    <span class="remove-tag material-icons" data-tag="${tag}">close</span>
                </span>
            `).join('');
            tagsHidden.value = JSON.stringify(tags);
        };

        // Add tag when pressing Enter
        tagInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const tag = tagInput.value.trim();
                if (tag && !tags.includes(tag)) {
                    tags.push(tag);
                    updateTags();
                    tagInput.value = '';
                }
            }
        });

        // Remove tag when clicking X
        tagsList.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-tag')) {
                const tagToRemove = e.target.dataset.tag;
                tags = tags.filter(tag => tag !== tagToRemove);
                updateTags();
            }
        });

        // Load existing tags when editing
        this.loadTags = (existingTags) => {
            if (existingTags) {
                try {
                    tags = JSON.parse(existingTags);
                    updateTags();
                } catch (e) {
                    console.error('Error loading tags:', e);
                    tags = [];
                }
            }
        };
    }

    setupCustomFields() {
        const customFieldsList = document.getElementById('customFieldsList');
        const customFieldsInput = document.getElementById('customFields');
        const addCustomFieldBtn = document.querySelector('.add-custom-field');
        let customFields = [];

        // Function to update custom fields
        const updateCustomFields = () => {
            customFieldsList.innerHTML = customFields.map((field, index) => `
                <div class="custom-field-item">
                    <input type="text" 
                           placeholder="Field Name" 
                           value="${field.name}"
                           onchange="this.dataset.index=${index}; this.dispatchEvent(new Event('fieldchange'))">
                    <input type="text" 
                           placeholder="Field Value" 
                           value="${field.value}"
                           onchange="this.dataset.index=${index}; this.dispatchEvent(new Event('fieldchange'))">
                    <span class="material-icons remove-custom-field" data-index="${index}">close</span>
                </div>
            `).join('');
            customFieldsInput.value = JSON.stringify(customFields);
        };

        // Add new custom field
        addCustomFieldBtn.addEventListener('click', () => {
            customFields.push({ name: '', value: '' });
            updateCustomFields();
        });

        // Remove custom field
        customFieldsList.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-custom-field')) {
                const index = parseInt(e.target.dataset.index);
                customFields.splice(index, 1);
                updateCustomFields();
            }
        });

        // Update field values
        customFieldsList.addEventListener('fieldchange', (e) => {
            const input = e.target;
            const index = parseInt(input.dataset.index);
            const isName = input.placeholder === 'Field Name';
            
            if (isName) {
                customFields[index].name = input.value;
            } else {
                customFields[index].value = input.value;
            }
            customFieldsInput.value = JSON.stringify(customFields);
        });

        // Load existing custom fields
        this.loadCustomFields = (existingFields) => {
            if (existingFields) {
                try {
                    customFields = JSON.parse(existingFields);
                    updateCustomFields();
                } catch (e) {
                    console.error('Error loading custom fields:', e);
                    customFields = [];
                }
            }
        };
    }

    async checkDatabaseIntegrity() {
        try {
            const response = await fetch('http://localhost:3001/contacts');
            const contacts = await response.json();
            
            let issues = [];
            let stats = {
                total: contacts.length,
                withImages: 0,
                withVideos: 0,
                withAttachments: 0,
                corruptedData: 0
            };

            contacts.forEach((contact, index) => {
                // Check required fields
                if (!contact.firstName && !contact.lastName) {
                    issues.push(`Contact #${contact.id}: Missing both first and last name`);
                }

                // Check image data integrity
                ['image', 'image2', 'image3', 'image4', 'image5'].forEach(imgField => {
                    if (contact[imgField]) {
                        try {
                            const parsed = JSON.parse(contact[imgField]);
                            if (!parsed.data || !parsed.filename) {
                                issues.push(`Contact #${contact.id}: Corrupted ${imgField} data`);
                            } else {
                                stats.withImages++;
                            }
                        } catch (e) {
                            issues.push(`Contact #${contact.id}: Invalid ${imgField} JSON`);
                            stats.corruptedData++;
                        }
                    }
                });

                // Check video data integrity
                if (contact.video) {
                    try {
                        const parsed = JSON.parse(contact.video);
                        if (!parsed.data || !parsed.filename) {
                            issues.push(`Contact #${contact.id}: Corrupted video data`);
                        } else {
                            stats.withVideos++;
                        }
                    } catch (e) {
                        issues.push(`Contact #${contact.id}: Invalid video JSON`);
                        stats.corruptedData++;
                    }
                }

                // Check attachments integrity
                if (contact.attachments) {
                    try {
                        const parsed = JSON.parse(contact.attachments);
                        if (!Array.isArray(parsed)) {
                            issues.push(`Contact #${contact.id}: Invalid attachments format`);
                        } else {
                            stats.withAttachments++;
                            parsed.forEach((attachment, i) => {
                                if (!attachment.name || !attachment.data) {
                                    issues.push(`Contact #${contact.id}: Corrupted attachment #${i + 1}`);
                                }
                            });
                        }
                    } catch (e) {
                        issues.push(`Contact #${contact.id}: Invalid attachments JSON`);
                        stats.corruptedData++;
                    }
                }
            });

            // Display results
            if (issues.length > 0) {
                console.error('Database integrity issues found:', issues);
                alert(`Database check complete.\n\nIssues found: ${issues.length}\n\nStats:\n` +
                      `Total contacts: ${stats.total}\n` +
                      `With images: ${stats.withImages}\n` +
                      `With videos: ${stats.withVideos}\n` +
                      `With attachments: ${stats.withAttachments}\n` +
                      `Corrupted entries: ${stats.corruptedData}\n\n` +
                      `See console for detailed issues.`);
            } else {
                alert(`Database integrity check passed!\n\nStats:\n` +
                      `Total contacts: ${stats.total}\n` +
                      `With images: ${stats.withImages}\n` +
                      `With videos: ${stats.withVideos}\n` +
                      `With attachments: ${stats.withAttachments}`);
            }
        } catch (error) {
            console.error('Database check error:', error);
            alert('Error checking database: ' + error.message);
        }
    }
}

// Initialize the contact database
const contactDB = new ContactDatabase();

function playVideo(button, videoId) {
    const width = 800;  // Slightly larger to accommodate YouTube's player
    const height = 450;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;
    
    window.open(
        `https://www.youtube.com/watch?v=${videoId}`,  // Changed to watch URL
        'YouTube Video',
        `width=${width},height=${height},left=${left},top=${top},location=yes,menubar=no,toolbar=no,status=no`
    );
} 