document.addEventListener('DOMContentLoaded', () => {
    // CONFIGURATION
    const googleSheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSLidSfiZggDJFDotoybDCnVvjoKrv6lzY8EXxzunideDy7XqEqFK8gyCprpKt0ii2JxbE5d5JvpQdq/pub?gid=640221730&single=true&output=csv';

    // ELEMENT SELECTORS
    const headerTitle = document.getElementById('header-title');
    const calendarView = document.getElementById('calendar-view');
    const commentListView = document.getElementById('comment-list-view');
    const detailView = document.getElementById('detail-view');
    const mainFooter = document.getElementById('main-footer');

    // Calendar elements
    const monthYearDisplay = document.getElementById('month-year-display');
    const calendarGrid = document.getElementById('calendar-grid');
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');
    const calendarDetails = document.getElementById('calendar-details');

    // Navigation buttons
    const showCalendarBtn = document.getElementById('show-calendar-btn');
    const showCommentsBtn = document.getElementById('show-comments-btn');

    let studentData = [];
    let currentStudentName = '';
    let currentDate = new Date();

    function getStudentNameFromURL() {
        const params = new URLSearchParams(window.location.search);
        const name = params.get('name');
        return name ? decodeURIComponent(name) : null;
    }

    async function fetchDataAndRender() {
        try {
            const response = await fetch(googleSheetURL);
            if (!response.ok) throw new Error('Network response was not ok');
            const csvText = await response.text();
            const allData = parseCSV(csvText);
            studentData = allData.filter(row => row.student === currentStudentName);

            if (studentData.length > 0) {
                headerTitle.textContent = `สรุปผลการเรียน - น้อง${currentStudentName}`;
                renderCalendar();
                renderCommentListView();
                setupEventListeners();
            } else {
                headerTitle.textContent = 'ไม่พบข้อมูลนักเรียน';
            }
        } catch (error) {
            console.error('Fetch Error:', error);
            headerTitle.textContent = 'เกิดข้อผิดพลาดในการโหลดข้อมูล';
        }
    }

    function parseCSV(text) {
        const rows = text.split('\n').slice(1);
        return rows.map(row => {
            const columns = row.split(',');
            const originalDate = columns[3]?.trim();
            const originalTime = columns[4]?.trim();
            const newDate = columns[5]?.trim();
            const newTime = columns[6]?.trim();

            const item = {
                classId: columns[0]?.trim(),
                student: columns[1]?.trim(),
                studentId: columns[2]?.trim(),
                date: originalDate,
                time: originalTime,
                topic: columns[8]?.trim(),
                score: columns[9]?.trim(),
                subject: columns[10]?.trim(),
                comment: columns[11]?.trim().replace(/"/g, ''),
                newDate: newDate,
                newTime: newTime,
                reason: columns[7]?.trim(),
                // สร้างข้อมูลหลักที่จะใช้แสดงผล
                effectiveDate: (newDate && newDate.trim() !== '') ? newDate : originalDate,
                effectiveTime: (newTime && newTime.trim() !== '') ? newTime : originalTime,
            };
            return item;
        }).filter(row => row.student && row.date);
    }

    // --- RENDER FUNCTIONS ---
    function renderCalendar() {
        calendarGrid.innerHTML = '';
        calendarDetails.innerHTML = '';
        const month = currentDate.getMonth();
        const year = currentDate.getFullYear();
        monthYearDisplay.textContent = new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' }).format(currentDate);
        const classesInMonth = studentData.map(item => new Date(item.effectiveDate)).filter(itemDate => itemDate.getMonth() === month && itemDate.getFullYear() === year).map(itemDate => itemDate.getDate());
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let i = 0; i < firstDayOfMonth; i++) { calendarGrid.insertAdjacentHTML('beforeend', '<div></div>'); }
        for (let day = 1; day <= daysInMonth; day++) {
            const dayEl = document.createElement('div');
            dayEl.textContent = day; dayEl.classList.add('day');
            if (classesInMonth.includes(day)) {
                dayEl.classList.add('has-class');
                dayEl.addEventListener('click', () => showClassDetailsForDate(year, month, day));
            }
            calendarGrid.appendChild(dayEl);
        }
    }

    function showClassDetailsForDate(year, month, day) {
        const classesOnDate = studentData.filter(item => {
            const itemDate = new Date(item.effectiveDate);
            return itemDate.getFullYear() === year && itemDate.getMonth() === month && itemDate.getDate() === day;
        });
        calendarDetails.innerHTML = '';
        if (classesOnDate.length > 0) {
            classesOnDate.forEach(item => {
                calendarDetails.innerHTML += `<div class="card"><h3>${item.topic}</h3><p>วิชา: ${item.subject} | เวลา: ${item.effectiveTime}</p></div>`;
            });
        }
    }


    function renderCommentListView() {
        commentListView.innerHTML = '';
        const sortedData = [...studentData].sort((a, b) => new Date(b.effectiveDate) - new Date(a.effectiveDate));
        const groupedByMonth = sortedData.reduce((acc, item) => {
            const itemDate = new Date(item.effectiveDate);
            const year = itemDate.getFullYear();
            const month = String(itemDate.getMonth()).padStart(2, '0');
            const key = `${year}-${month}`;
            if (!acc[key]) { acc[key] = []; }
            acc[key].push(item);
            return acc;
        }, {});

        for (const monthKey in groupedByMonth) {
            const itemsInMonth = groupedByMonth[monthKey];
            const headerDate = new Date(itemsInMonth[0].effectiveDate);
            const monthName = headerDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
            const monthHeader = document.createElement('h2');
            monthHeader.className = 'month-header';
            monthHeader.textContent = monthName;
            commentListView.appendChild(monthHeader);

            itemsInMonth.forEach(item => {
                const thaiDate = new Date(item.effectiveDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
                const listItem = document.createElement('div');
                listItem.className = 'card';
                listItem.dataset.classId = item.classId;
                 listItem.innerHTML = `
                    <div class="comment-card">
                    <h3>${item.topic}</h3>
                    <p>${item.subject}</p>
                    </div>
                    <p>${thaiDate} เวลา ${item.effectiveTime || 'N/A'}</p>
                `;
                listItem.addEventListener('click', () => renderDetailView(item.classId));
                commentListView.appendChild(listItem);
            });
        }
    }

    function renderDetailView(classId) {
        const item = studentData.find(d => d.classId === classId);
        if (!item) return;
        
        let rescheduleHtml = '';

        if (item.newDate && item.newDate.trim() !== '') {
            const originalFullDate = new Date(item.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
            const newFullDate = new Date(item.newDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
            
            rescheduleHtml = `
                <div class="reschedule-info">
                    <p>
                        <strong>(มีการเลื่อนเรียน)</strong><br>
                        <strong>วันที่เรียน:</strong> ${originalFullDate} เวลา ${item.time} <br>
                        <strong>เลื่อนเป็น:</strong> ${newFullDate} เวลา ${item.newTime} <br>
                        <strong>เหตุผล:</strong> ${item.reason || 'ไม่ได้ระบุ'}
                    </p>
                </div>
            `;
        }

        // Hide main views and footer
        calendarView.classList.add('hidden');
        commentListView.classList.add('hidden');
        mainFooter.classList.add('hidden');
        
        // Show detail view
        detailView.classList.remove('hidden');
        headerTitle.textContent = `รายละเอียดการเรียน`;

        const thaiDate = new Date(item.effectiveDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
        detailView.innerHTML = `
            <button class="back-btn"> &lt; กลับไปหน้ารายการ</button>
            <div class="card">
                <h2>${item.topic}</h2>
                ${rescheduleHtml}
                <div class="meta">
                    <p><strong>วันที่:</strong> ${thaiDate}</p>
                    <p><strong>เวลา:</strong> ${item.effectiveTime || 'N/A'}</p>
                    <p><strong>วิชา:</strong> ${item.subject}</p>
                </div>
                <p><strong>คะแนน:</strong> ${item.score || 'ไม่มีคะแนน'}</p>
                <p><strong>คอมเมนต์จากผู้สอน:</strong></p>
                <p>${item.comment || 'ไม่มีคอมเมนต์'}</p>
            </div>`;
            
        detailView.querySelector('.back-btn').addEventListener('click', () => {
            // Hide detail view
            detailView.classList.add('hidden');
            // Show comment list and footer
            commentListView.classList.remove('hidden');
            mainFooter.classList.remove('hidden');
            // Reset header title
            headerTitle.textContent = `สรุปผลการเรียน - น้อง${currentStudentName}`;
        });
        window.scrollTo(0, 0);
    }
    
    // --- EVENT LISTENERS ---
    function setupEventListeners() {
        showCalendarBtn.addEventListener('click', () => {
            calendarView.classList.remove('hidden');
            commentListView.classList.add('hidden');
            detailView.classList.add('hidden'); // Ensure detail is hidden
            mainFooter.classList.remove('hidden');
            showCalendarBtn.classList.add('active');
            showCommentsBtn.classList.remove('active');
        });

        showCommentsBtn.addEventListener('click', () => {
            calendarView.classList.add('hidden');
            commentListView.classList.remove('hidden');
            detailView.classList.add('hidden'); // Ensure detail is hidden
            mainFooter.classList.remove('hidden');
            showCalendarBtn.classList.remove('active');
            showCommentsBtn.classList.add('active');
        });
        
        prevMonthBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar();
        });

        nextMonthBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar();
        });
    }

    // --- INITIAL LOAD ---
    currentStudentName = getStudentNameFromURL();
    if (currentStudentName) {
        fetchDataAndRender();
    } else {
        headerTitle.textContent = 'ไม่พบข้อมูล';
        document.querySelector('main').innerHTML = '<p>กรุณาระบุชื่อนักเรียนใน URL เช่น <strong>student.html?name=ปันปัน</strong></p>';
    }
});